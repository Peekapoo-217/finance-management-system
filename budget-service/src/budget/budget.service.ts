import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetPeriod } from './enums/budget-period.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(Budget)
    private budgetRepository: Repository<Budget>,
    private eventEmitter: EventEmitter2,
  ) {}

 async create(userId: number, dto: CreateBudgetDto): Promise<Budget> {
    const budget = new Budget();
    budget.userId = userId;
    budget.categoryId = dto.categoryId;
    budget.limitAmount = dto.limitAmount;
    budget.period = dto.period as BudgetPeriod;  // Ép kiểu rõ ràng
    budget.spentAmount = 0;

    return await this.budgetRepository.save(budget);
  }

 async findAll(userId: number): Promise<any[]> {
  return await this.budgetRepository.find({
    where: { userId },
    relations: ['category'],  // Join để lấy tên category
  });
}

  async findOne(id: number, userId: number): Promise<Budget> {
  const budget = await this.budgetRepository.findOne({
    where: { id, userId },
    relations: ['category'],  // Join
  });
  if (!budget) throw new NotFoundException('Budget not found');
  return budget;
}

 async update(id: number, userId: number, dto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.findOne(id, userId);

    if (dto.categoryId !== undefined) budget.categoryId = dto.categoryId;
    if (dto.limitAmount !== undefined) budget.limitAmount = dto.limitAmount;
    if (dto.period !== undefined) budget.period = dto.period as BudgetPeriod;  // Ép kiểu

    return await this.budgetRepository.save(budget);
  }

  async remove(id: number, userId: number): Promise<void> {
    const result = await this.budgetRepository.delete({ id, userId });
    if (result.affected === 0) throw new NotFoundException('Budget not found');
  }

  async updateSpentAmountFromTransaction(
    userId: string,
    categoryId: string,
    amount: number,
    transactionDate: Date,
  ): Promise<void> {
    const budgets = await this.budgetRepository.find({
      where: {
        userId: Number(userId),  // Ép kiểu nếu userId trong entity là number
        categoryId: Number(categoryId),  // Ép kiểu nếu categoryId là number
      },
    });

    for (const budget of budgets) {
      if (this.isDateInPeriod(transactionDate, budget.period)) {
        budget.spentAmount += amount;
        await this.budgetRepository.save(budget);

        if (budget.spentAmount > budget.limitAmount) {
          this.eventEmitter.emit('budget.exceeded', {
            userId,
            budgetId: budget.id,
            categoryId,
            limit: budget.limitAmount,
            spent: budget.spentAmount,
          });
        }
        break;
      }
    }
  }

  private isDateInPeriod(date: Date, period: BudgetPeriod): boolean {
    const now = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();

    switch (period) {
      case BudgetPeriod.WEEKLY:
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return date >= startOfWeek;
      case BudgetPeriod.MONTHLY:
        return date.getMonth() === month && date.getFullYear() === year;
      case BudgetPeriod.YEARLY:
        return date.getFullYear() === year;
      default:
        return false;
    }
  }
}
