import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateWalletDto } from './create-wallet.dto';
import { Wallet } from 'src/transaction/entities/wallet.entity';


@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
  ) { }

  async create(userId: string, dto: CreateWalletDto): Promise<Wallet> {
    const wallet = this.walletRepository.create({
      ...dto,
      userId,
      balance: dto.balance || 0,
    });
    return this.walletRepository.save(wallet);
  }

  async findAll(userId: string): Promise<Wallet[]> {
    const wallets = await this.walletRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    // Lazy creation: Nếu user chưa có wallet nào, tự động tạo wallet mặc định
    if (wallets.length === 0) {
      const defaultWallet = await this.create(userId, {
        name: 'Ví chính',
        balance: 0,
        currency: 'VND',
        type: 'cash',
      });
      return [defaultWallet];
    }

    return wallets;
  }

  async findOne(id: string, userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id, userId },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  async update(id: string, userId: string, dto: any): Promise<Wallet> {
    const wallet = await this.findOne(id, userId);

    if (dto.name !== undefined) wallet.name = dto.name;
    if (dto.balance !== undefined) wallet.balance = dto.balance;
    if (dto.currency !== undefined) wallet.currency = dto.currency;
    if (dto.type !== undefined) wallet.type = dto.type;

    return this.walletRepository.save(wallet);
  }

  async delete(id: string, userId: string): Promise<void> {
    const wallet = await this.findOne(id, userId);
    await this.walletRepository.remove(wallet);
  }
}