import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@nestjs/microservices';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { Category } from './entities/category.entity';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { redisConfig } from '../config/redis.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Wallet, Category]),
    ClientsModule.register([redisConfig]),
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}