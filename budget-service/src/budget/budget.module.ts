import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule } from '@nestjs/microservices';
import { Budget } from './entities/budget.entity';
import { BudgetController } from './budget.controller';
import { BudgetEventsController } from './budget-events.controller';
import { BudgetService } from './budget.service';
import { CategoryModule } from '../category/category.module';
import { ConsulClientService } from '../consul/consul-client.service';
import { AuthServiceGuard } from '../auth/guards/auth-service.guard';
import { redisConfig } from '../config/redis.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Budget]),
    ClientsModule.register([redisConfig]),
    HttpModule,
    CategoryModule, // Import CategoryModule để dùng CategoryService
  ],
  controllers: [BudgetController, BudgetEventsController],
  providers: [BudgetService, ConsulClientService, AuthServiceGuard],
})
export class BudgetModule { }