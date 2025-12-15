import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from './entities/budget.entity';
import { BudgetController } from './budget.controller';
import { BudgetEventsController } from './budget-events.controller';
import { BudgetService } from './budget.service';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Budget]),
    CategoryModule, // Import CategoryModule để dùng CategoryService
  ],
  controllers: [BudgetController, BudgetEventsController],
  providers: [BudgetService],
})
export class BudgetModule {}