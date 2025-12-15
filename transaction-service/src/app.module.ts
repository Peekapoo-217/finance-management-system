import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { HealthController } from './health/health.controller';
import { TransactionModule } from './transaction/transaction.module';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WalletModule } from './wallet/wallet.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,  // Truyền hàm trực tiếp
      inject: [ConfigService],     // Inject ConfigService vào factory
    }),
    WalletModule,
    CategoryModule,
    TransactionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}