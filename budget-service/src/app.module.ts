import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { getDatabaseConfig } from './config/database.config';
import { HealthController } from './health/health.controller';
import { BudgetModule } from './budget/budget.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    BudgetModule,
    CategoryModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}