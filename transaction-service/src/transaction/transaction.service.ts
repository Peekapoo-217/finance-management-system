import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { Category } from './entities/category.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CategoryType } from './enums';
import { ConsulClientService } from '../consul/consul-client.service';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @Inject('REDIS_SERVICE')
    private redisClient: ClientProxy,
    private dataSource: DataSource,
    private httpService: HttpService,
    private consulClient: ConsulClientService,
  ) { }

  async create(userId: string, dto: CreateTransactionDto, authToken?: string): Promise<Transaction> {
    // Chọn ví: ưu tiên walletId, nếu không có sẽ lấy ví đầu tiên của user
    let wallet: Wallet | null = null;
    if (dto.walletId) {
      wallet = await this.walletRepository.findOne({
        where: { id: dto.walletId, userId }
      });
      if (!wallet) throw new NotFoundException('Wallet not found');
    } else {
      wallet = await this.walletRepository.findOne({
        where: { userId },
        order: { createdAt: 'ASC' },
      });
      if (!wallet) throw new NotFoundException('No wallet available for this user');
    }

    // Xác định category: ưu tiên categoryId, nếu không có thì dùng categoryName + categoryType
    let category: Category | null = null;

    const looksLikeUuid = (val: string | undefined) =>
      !!val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(val);

    if (dto.categoryId && looksLikeUuid(dto.categoryId)) {
      category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId, userId }
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    // Nếu không có category hoặc categoryId không phải UUID -> dùng categoryName + categoryType
    if (!category) {
      if (!dto.categoryName || !dto.categoryType) {
        throw new BadRequestException('categoryName and categoryType are required when categoryId is not provided');
      }

      category = await this.categoryRepository.findOne({
        where: { name: dto.categoryName, type: dto.categoryType, userId }
      });

      if (!category) {
        // Tạo mới category nội bộ nếu chưa có
        category = this.categoryRepository.create({
          name: dto.categoryName,
          type: dto.categoryType,
          userId,
        });
        category = await this.categoryRepository.save(category);
      }
    }

    // Validate đủ số dư cho chi tiêu
    if (category.type === CategoryType.EXPENSE && wallet.balance < dto.amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Validate: Nếu là expense, phải có budget trước
    if (category.type === CategoryType.EXPENSE) {
      try {
        const budgetServiceUrl = await this.consulClient.resolveService('budget-service');

        // Pass user's token để budget-service có thể lấy userId và check budget của đúng user
        const checkResponse = await firstValueFrom(
          this.httpService.get(`${budgetServiceUrl}/budgets/check/${encodeURIComponent(category.name)}`, {
            headers: {
              Authorization: authToken || 'Bearer dummy-token',
              'Content-Type': 'application/json',
            },
          }),
        );

        const hasBudget = checkResponse.data?.hasBudget;
        if (!hasBudget) {
          throw new BadRequestException(
            `Danh mục "${category.name}" chưa có ngân sách. Vui lòng tạo ngân sách trước khi thêm giao dịch.`
          );
        }
      } catch (error: any) {
        // Nếu lỗi là BadRequestException từ validation -> throw lại
        if (error.response?.status === 400 || error.message?.includes('chưa có ngân sách')) {
          throw error;
        }
        // Nếu lỗi khác (network, service unavailable) -> log và cho phép tạo transaction
        this.logger.warn(`Failed to check budget for category ${category.name}: ${error.message}`);
      }
    }

    this.logger.log(`Creating transaction: userId=${userId}, amount=${dto.amount}, type=${category.type}`);

    // WRAP TRONG DATABASE TRANSACTION để đảm bảo atomic operations
    const result = await this.dataSource.transaction(async (entityManager) => {
      // Bước 1: Tạo và lưu transaction
      const transaction = entityManager.create(Transaction, {
        ...dto,
        userId,
        wallet,
        category,
      });

      const saved = await entityManager.save(Transaction, transaction);
      this.logger.debug(`Transaction saved: id=${saved.id}`);

      // Bước 2: Cập nhật wallet balance
      const amount = Number(dto.amount);
      const currentBalance = Number(wallet.balance);
      if (Number.isNaN(amount) || Number.isNaN(currentBalance)) {
        throw new BadRequestException('Invalid amount or wallet balance');
      }

      const oldBalance = currentBalance;
      if (category.type === CategoryType.EXPENSE) {
        wallet.balance = currentBalance - amount;
      } else {
        wallet.balance = currentBalance + amount;
      }

      await entityManager.save(Wallet, wallet);
      this.logger.debug(
        `Wallet updated: id=${wallet.id}, oldBalance=${oldBalance}, newBalance=${wallet.balance}`
      );

      // Nếu đến đây không có lỗi -> COMMIT cả 2 operations
      // Nếu có lỗi bất kỳ -> ROLLBACK tất cả
      return saved;
    });

    // Phát event qua Redis cho budget-service (sau khi DB transaction commit thành công)
    try {
      this.redisClient.emit('transaction.created', {
        userId,
        categoryId: dto.categoryId,
        categoryName: category.name, // THÊM: category name để Budget Service match
        amount: dto.amount,
        type: category.type,
        date: dto.transactionDate,
        transactionId: result.id,
      });
      this.logger.log(`Event emitted: transaction.created for id=${result.id}, category=${category.name}`);
    } catch (error) {
      // Log nhưng không throw - event emission không nên fail toàn bộ operation
      this.logger.error(`Failed to emit event for transaction ${result.id}:`, error);
    }

    return result;
  }

  async findAll(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      relations: ['wallet', 'category'],
      order: { transactionDate: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, userId },
      relations: ['wallet', 'category'],
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async update(id: string, userId: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const oldTransaction = await this.findOne(id, userId);

    // Lưu thông tin cũ để rollback budget
    const oldAmount = Number(oldTransaction.amount);
    const oldCategoryName = oldTransaction.category.name;
    const oldCategoryType = oldTransaction.category.type;
    const oldDate = oldTransaction.transactionDate;

    // Nếu chỉ update thông tin đơn giản (description, date), không cần transaction
    if (!dto.amount && !dto.walletId && !dto.categoryId && !dto.categoryName && !dto.categoryType) {
      Object.assign(oldTransaction, dto);
      const updated = await this.transactionRepository.save(oldTransaction);

      // Nếu chỉ đổi date và là expense, cần rollback budget cũ và update budget mới
      if (dto.transactionDate && oldCategoryType === CategoryType.EXPENSE) {
        try {
          this.redisClient.emit('transaction.updated', {
            userId,
            transactionId: id,
            oldData: {
              categoryName: oldCategoryName,
              amount: oldAmount,
              type: oldCategoryType,
              date: oldDate,
            },
            newData: {
              categoryName: oldCategoryName,
              amount: oldAmount,
              type: oldCategoryType,
              date: dto.transactionDate,
            },
          });
        } catch (error) {
          this.logger.error(`Failed to emit update event:`, error);
        }
      }

      return updated;
    }

    // Nếu update amount/wallet/category → cần recalculate wallet balance
    // Bước 1: Rollback wallet balance của transaction cũ
    const oldWallet = oldTransaction.wallet;
    const oldCategory = oldTransaction.category;

    // Bước 2: Tìm wallet và category mới (nếu có thay đổi)
    let newWallet: Wallet = oldWallet;
    if (dto.walletId && dto.walletId !== oldTransaction.walletId) {
      const foundWallet = await this.walletRepository.findOne({
        where: { id: dto.walletId, userId }
      });
      if (!foundWallet) {
        throw new NotFoundException('New wallet not found');
      }
      newWallet = foundWallet;
    }

    let newCategory: Category = oldCategory;
    const looksLikeUuid = (val: string | undefined) =>
      !!val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(val);

    if (dto.categoryId && looksLikeUuid(dto.categoryId) && dto.categoryId !== oldTransaction.categoryId) {
      const foundCategory = await this.categoryRepository.findOne({
        where: { id: dto.categoryId, userId }
      });
      if (!foundCategory) {
        throw new NotFoundException('New category not found');
      }
      newCategory = foundCategory;
    } else if (dto.categoryName && dto.categoryType) {
      let foundCategory = await this.categoryRepository.findOne({
        where: { name: dto.categoryName, type: dto.categoryType, userId }
      });
      if (!foundCategory) {
        foundCategory = this.categoryRepository.create({
          name: dto.categoryName,
          type: dto.categoryType,
          userId,
        });
        foundCategory = await this.categoryRepository.save(foundCategory);
      }
      newCategory = foundCategory;
    }

    const newAmount = dto.amount ? Number(dto.amount) : oldAmount;
    const newDate = dto.transactionDate ? new Date(dto.transactionDate) : oldDate;

    // Validate đủ số dư cho chi tiêu mới
    if (newCategory.type === CategoryType.EXPENSE && newWallet.balance < newAmount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // WRAP TRONG DATABASE TRANSACTION để đảm bảo atomic operations
    const result = await this.dataSource.transaction(async (entityManager) => {
      // Bước 1: Rollback wallet balance cũ
      const oldWalletBalance = Number(oldWallet.balance);
      if (oldCategory.type === CategoryType.EXPENSE) {
        oldWallet.balance = oldWalletBalance + oldAmount; // Hoàn trả tiền
      } else {
        oldWallet.balance = oldWalletBalance - oldAmount; // Trừ tiền đã cộng
      }
      await entityManager.save(Wallet, oldWallet);

      // Bước 2: Cập nhật wallet balance mới (nếu wallet khác)
      if (newWallet.id !== oldWallet.id) {
        const newWalletBalance = Number(newWallet.balance);
        if (newCategory.type === CategoryType.EXPENSE) {
          newWallet.balance = newWalletBalance - newAmount;
        } else {
          newWallet.balance = newWalletBalance + newAmount;
        }
        await entityManager.save(Wallet, newWallet);
      } else {
        // Cùng wallet, cập nhật balance dựa trên sự khác biệt
        const currentBalance = Number(newWallet.balance);
        if (newCategory.type === CategoryType.EXPENSE) {
          newWallet.balance = currentBalance - newAmount;
        } else {
          newWallet.balance = currentBalance + newAmount;
        }
        await entityManager.save(Wallet, newWallet);
      }

      // Bước 3: Cập nhật transaction
      Object.assign(oldTransaction, {
        ...dto,
        wallet: newWallet,
        category: newCategory,
        amount: newAmount,
        transactionDate: newDate,
      });
      const updated = await entityManager.save(Transaction, oldTransaction);

      return updated;
    });

    // Emit event để budget-service cập nhật
    try {
      this.redisClient.emit('transaction.updated', {
        userId,
        transactionId: id,
        oldData: {
          categoryName: oldCategoryName,
          amount: oldAmount,
          type: oldCategoryType,
          date: oldDate,
        },
        newData: {
          categoryName: newCategory.name,
          amount: newAmount,
          type: newCategory.type,
          date: newDate,
        },
      });
      this.logger.log(`Event emitted: transaction.updated for id=${id}`);
    } catch (error) {
      this.logger.error(`Failed to emit update event:`, error);
    }

    return result;
  }

  async remove(id: string, userId: string): Promise<void> {
    const transaction = await this.findOne(id, userId);

    this.logger.log(`Removing transaction: id=${id}, userId=${userId}`);

    // WRAP TRONG TRANSACTION để rollback wallet balance
    await this.dataSource.transaction(async (entityManager) => {
      // Bước 1: Rollback wallet balance
      const wallet = transaction.wallet;
      if (!wallet) {
        throw new NotFoundException('Wallet not found for transaction');
      }

      const amount = Number(transaction.amount);
      const currentBalance = Number(wallet.balance);
      if (Number.isNaN(amount) || Number.isNaN(currentBalance)) {
        throw new BadRequestException('Invalid amount or wallet balance');
      }

      if (transaction.category.type === CategoryType.EXPENSE) {
        wallet.balance = currentBalance + amount; // Hoàn trả tiền
      } else {
        wallet.balance = currentBalance - amount; // Trừ tiền đã cộng
      }

      await entityManager.save(Wallet, wallet);
      this.logger.debug(`Wallet balance restored: id=${wallet.id}, balance=${wallet.balance}`);

      // Bước 2: Xóa transaction
      await entityManager.remove(Transaction, transaction);
      this.logger.debug(`Transaction removed: id=${id}`);

      // COMMIT cả 2 operations nếu thành công
    });

    // Emit event để các service khác biết (optional)
    try {
      this.redisClient.emit('transaction.deleted', {
        userId,
        transactionId: id,
        categoryId: transaction.category.id,
        categoryName: transaction.category.name,
        amount: transaction.amount,
        type: transaction.category.type,
        date: transaction.transactionDate,
      });
      this.logger.log(`Event emitted: transaction.deleted for id=${id}, category=${transaction.category.name}`);
    } catch (error) {
      this.logger.error(`Failed to emit deletion event for transaction ${id}:`, error);
    }
  }

  /**
   * Cascade delete tất cả transactions của một category
   * Được gọi khi budget bị xóa
   * @returns Object chứa số lượng transactions đã xóa và tổng số tiền rollback
   */
  async cascadeDeleteByCategory(
    userId: string,
    categoryName: string,
  ): Promise<{ deletedCount: number; totalRollback: number }> {
    this.logger.log(
      `Starting cascade delete for userId=${userId}, category="${categoryName}"`,
    );

    // Tìm tất cả transactions của category
    const transactions = await this.transactionRepository.find({
      where: {
        userId,
        category: {
          name: categoryName,
        },
      },
      relations: ['wallet', 'category'],
    });

    if (transactions.length === 0) {
      this.logger.log(`No transactions found for category: ${categoryName}`);
      return { deletedCount: 0, totalRollback: 0 };
    }

    this.logger.log(
      `Found ${transactions.length} transactions to delete for category: ${categoryName}`,
    );

    let deletedCount = 0;
    let totalRollback = 0;

    // Xóa từng transaction với rollback
    for (const transaction of transactions) {
      try {
        // Wrap trong database transaction để đảm bảo atomic
        await this.dataSource.transaction(async (entityManager) => {
          const wallet = transaction.wallet;

          if (!wallet) {
            this.logger.warn(`Wallet not found for transaction ${transaction.id}, skipping`);
            return;
          }

          const amount = Number(transaction.amount);
          const currentBalance = Number(wallet.balance);

          if (Number.isNaN(amount) || Number.isNaN(currentBalance)) {
            this.logger.warn(`Invalid amount or balance for transaction ${transaction.id}, skipping`);
            return;
          }

          // Rollback wallet balance
          if (transaction.category.type === CategoryType.EXPENSE) {
            wallet.balance = currentBalance + amount;
            totalRollback += amount;
            this.logger.debug(
              `Rollback EXPENSE: transaction=${transaction.id}, wallet=${wallet.id}, +${amount}`,
            );
          } else {
            wallet.balance = currentBalance - amount;
            this.logger.debug(
              `Rollback INCOME: transaction=${transaction.id}, wallet=${wallet.id}, -${amount}`,
            );
          }

          // Save wallet
          await entityManager.save(Wallet, wallet);

          // Delete transaction
          await entityManager.remove(Transaction, transaction);

          deletedCount++;
        });

        this.logger.debug(
          `Transaction deleted: id=${transaction.id}, amount=${transaction.amount}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to delete transaction ${transaction.id}: ${error.message}`,
          error.stack,
        );
        // Continue với transactions khác
      }
    }

    this.logger.log(
      `Cascade delete completed: deleted=${deletedCount}/${transactions.length} transactions, ` +
      `totalRollback=${totalRollback} VND`,
    );

    return { deletedCount, totalRollback };
  }
}
