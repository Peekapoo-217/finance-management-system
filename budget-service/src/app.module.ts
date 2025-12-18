import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { getDatabaseConfig } from './config/database.config';
import { HealthController } from './health/health.controller';
import { BudgetModule } from './budget/budget.module';
import { CategoryModule } from './category/category.module';
import { ConsulClientService } from './consul/consul-client.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    HttpModule,
    BudgetModule,
    CategoryModule,
  ],
  controllers: [HealthController],
  providers: [ConsulClientService],
  exports: [ConsulClientService],
})
export class AppModule {}