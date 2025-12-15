import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { Category } from './entities/category.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    // Validate wallet và category thuộc user
    const wallet = await this.walletRepository.findOne({ where: { id: dto.walletId, userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const category = await this.categoryRepository.findOne({ where: { id: dto.categoryId, userId } });
    if (!category) throw new NotFoundException('Category not found');

    const transaction = this.transactionRepository.create({
      ...dto,
      userId,
      wallet,
      category,
    });

    const saved = await this.transactionRepository.save(transaction);

    // Cập nhật balance ví
    if (category.type === 'expense') {
      wallet.balance -= dto.amount;
    } else {
      wallet.balance += dto.amount;
    }
    await this.walletRepository.save(wallet);

    // Phát event realtime cho budget-service
    this.eventEmitter.emit('transaction.created', {
      userId,
      categoryId: dto.categoryId,
      amount: dto.amount,
      type: category.type, // 'income' hoặc 'expense'
      date: dto.transactionDate,
      transactionId: saved.id,
    });

    return saved;
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
    Object.assign(transaction, dto);
    return this.transactionRepository.save(transaction);
  }

  async remove(id: string, userId: string): Promise<void> {
    const transaction = await this.findOne(id, userId);
    await this.transactionRepository.remove(transaction);
  }
}