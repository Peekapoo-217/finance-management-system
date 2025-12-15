import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { Category } from './entities/category.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

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
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    // Validate wallet và category thuộc user (trước transaction)
    const wallet = await this.walletRepository.findOne({ 
      where: { id: dto.walletId, userId } 
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const category = await this.categoryRepository.findOne({ 
      where: { id: dto.categoryId, userId } 
    });
    if (!category) throw new NotFoundException('Category not found');

    // Validate đủ số dư cho chi tiêu
    if (category.type === 'expense' && wallet.balance < dto.amount) {
      throw new BadRequestException('Insufficient wallet balance');
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
      const oldBalance = wallet.balance;
      if (category.type === 'expense') {
        wallet.balance -= dto.amount;
      } else {
        wallet.balance += dto.amount;
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
    const transaction = await this.findOne(id, userId);
    
    // Nếu chỉ update thông tin đơn giản (description, date), không cần transaction
    if (!dto.amount && !dto.walletId && !dto.categoryId) {
      Object.assign(transaction, dto);
      return this.transactionRepository.save(transaction);
    }

    // Nếu update amount/wallet/category → cần recalculate wallet balance
    // TODO: Implement proper update with wallet balance adjustment
    this.logger.warn('Update amount/wallet/category not fully implemented yet');
    throw new BadRequestException('Cannot update transaction amount, wallet, or category at this time');
  }

  async remove(id: string, userId: string): Promise<void> {
    const transaction = await this.findOne(id, userId);

    this.logger.log(`Removing transaction: id=${id}, userId=${userId}`);

    // WRAP TRONG TRANSACTION để rollback wallet balance
    await this.dataSource.transaction(async (entityManager) => {
      // Bước 1: Rollback wallet balance
      const wallet = transaction.wallet;
      if (transaction.category.type === 'expense') {
        wallet.balance += transaction.amount; // Hoàn trả tiền
      } else {
        wallet.balance -= transaction.amount; // Trừ tiền đã cộng
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
        amount: transaction.amount,
        type: transaction.category.type,
      });
      this.logger.log(`Event emitted: transaction.deleted for id=${id}`);
    } catch (error) {
      this.logger.error(`Failed to emit deletion event for transaction ${id}:`, error);
    }
  }
}