import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@nestjs/microservices';
import { HttpModule } from '@nestjs/axios';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { Category } from './entities/category.entity';
import { TransactionController } from './transaction.controller';
import { TransactionEventsController } from './transaction-events.controller';
import { TransactionService } from './transaction.service';
import { redisConfig } from '../config/redis.config';
import { AuthServiceGuard } from '../auth/guards/auth-service.guard';
import { ConsulClientService } from '../consul/consul-client.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Wallet, Category]),
    ClientsModule.register([redisConfig]),
    HttpModule,
  ],
  controllers: [TransactionController, TransactionEventsController],
  providers: [TransactionService, AuthServiceGuard, ConsulClientService],
})
export class TransactionModule { }