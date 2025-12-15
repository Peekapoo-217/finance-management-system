import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateWalletDto } from './create-wallet.dto';
import { Wallet } from 'src/transaction/entities/wallet.entity';


@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
  ) {}

  async create(userId: string, dto: CreateWalletDto): Promise<Wallet> {
    const wallet = this.walletRepository.create({
      ...dto,
      userId,
      balance: dto.balance || 0,
    });
    return this.walletRepository.save(wallet);
  }

  async findAll(userId: string): Promise<Wallet[]> {
  // Tạm thời bỏ filter userId để test
  return this.walletRepository.find();
  // Hoặc nếu muốn giữ filter nhưng test dễ:
  // return this.walletRepository.find({ where: { userId: userId || undefined } });
}
}