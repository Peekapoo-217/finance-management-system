import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Budget } from './entities/budget.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetPeriod } from './enums/budget-period.enum';
import { EventEmitterService } from '../common/event-emitter.service';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    @InjectRepository(Budget)
    private budgetRepository: Repository<Budget>,
    @Inject('REDIS_SERVICE')
    private redisClient: ClientProxy,
    private eventEmitter: EventEmitterService,
  ) { }

  async create(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    // Check for duplicate budget - one budget per category
    const existingBudget = await this.budgetRepository.findOne({
      where: {
        userId: userId,
        categoryId: dto.categoryId,
      },
      relations: ['category'],
    });

    if (existingBudget) {
      throw new NotFoundException(
        `Danh mục "${existingBudget.category?.name || 'này'}" đã có ngân sách. ` +
        `Mỗi danh mục chỉ được tạo một ngân sách duy nhất.`
      );
    }

    const budget = new Budget();
    budget.userId = userId;
    budget.categoryId = dto.categoryId;
    budget.limitAmount = dto.limitAmount;
    budget.period = dto.period as BudgetPeriod;  // Ép kiểu rõ ràng
    budget.spentAmount = 0;

    return await this.budgetRepository.save(budget);
  }

  async findAll(userId: string): Promise<any[]> {
    return await this.budgetRepository.find({
      where: { userId },
      relations: ['category'],  // Join để lấy tên category
    });
  }

  async findOne(id: string, userId: string): Promise<Budget> {
    const budget = await this.budgetRepository.findOne({
      where: { id, userId },
      relations: ['category'],  // Join
    });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  async update(id: string, userId: string, dto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.findOne(id, userId);

    if (dto.categoryId !== undefined) budget.categoryId = dto.categoryId;
    if (dto.limitAmount !== undefined) budget.limitAmount = dto.limitAmount;
    if (dto.period !== undefined) budget.period = dto.period as BudgetPeriod;  // Ép kiểu

    return await this.budgetRepository.save(budget);
  }

  async remove(id: string, userId: string): Promise<void> {
    // Load budget với category info TRƯỚC KHI XÓA
    const budget = await this.budgetRepository.findOne({
      where: { id, userId },
      relations: ['category'],
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // Save info để emit event
    const budgetData = {
      budgetId: budget.id,
      userId: budget.userId,
      categoryId: budget.categoryId,
      categoryName: budget.category?.name || '',
      limitAmount: budget.limitAmount,
      spentAmount: budget.spentAmount,
      period: budget.period,
    };

    // Xóa budget
    const result = await this.budgetRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException('Budget not found');
    }

    // Emit event để Transaction Service cascade delete
    const eventEmitted = await this.eventEmitter.emitWithRetry('budget.deleted', budgetData);

    if (!eventEmitted) {
      this.logger.warn(
        `WARNING: Event emission failed for budget deletion ${id}. ` +
        `Transaction Service may not cascade delete. Manual cleanup may be required.`
      );
    }
  }

  async hasBudgetForCategory(userId: string, categoryName: string): Promise<boolean> {
    const budgets = await this.budgetRepository.find({
      where: { userId },
      relations: ['category'],
    });

    return budgets.some(budget => budget.category?.name === categoryName);
  }

  async updateSpentAmountFromTransaction(
    userId: string,
    categoryId: string,
    amount: number,
    transactionDate: Date,
  ): Promise<void> {
    // Đảm bảo amount là number hợp lệ
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      this.logger.warn(`Invalid amount: ${amount}, skipping budget update`);
      return;
    }

    // Parse categoryId to number
    const categoryIdNum = parseInt(categoryId, 10);

    if (isNaN(categoryIdNum)) {
      this.logger.warn(`Invalid categoryId: ${categoryId}`);
      return;
    }

    // Filter theo userId và categoryId
    const budgets = await this.budgetRepository.find({
      where: {
        userId: userId,
        categoryId: categoryIdNum
      },
    });

    this.logger.log(
      `Found ${budgets.length} budgets for userId=${userId}, categoryId=${categoryIdNum}, transactionDate=${transactionDate.toISOString()}, amount=${amountNum}`
    );

    if (budgets.length === 0) {
      this.logger.warn(`No budgets found for userId=${userId}, categoryId=${categoryIdNum}`);
      return;
    }

    let updated = false;
    for (const budget of budgets) {
      const isInPeriod = this.isDateInPeriod(transactionDate, budget.period);
      this.logger.log(
        `Budget ${budget.id}: userId=${budget.userId}, period=${budget.period}, isInPeriod=${isInPeriod}, currentSpentAmount=${budget.spentAmount}, adding=${amountNum}`
      );

      if (isInPeriod) {
        const oldSpentAmount = Number(budget.spentAmount);

        // Atomic SQL update: Tránh race condition khi nhiều transactions cùng update
        await this.budgetRepository
          .createQueryBuilder()
          .update(Budget)
          .set({ spentAmount: () => 'spentAmount + :amount' })
          .setParameter('amount', amountNum)
          .where('id = :budgetId', { budgetId: budget.id })
          .execute();

        const newSpentAmount = oldSpentAmount + amountNum;
        updated = true;

        this.logger.log(
          `Budget ${budget.id} updated atomically: spentAmount ${oldSpentAmount} -> ${newSpentAmount} (added ${amountNum})`
        );

        if (newSpentAmount > budget.limitAmount) {
          this.logger.warn(
            `Budget exceeded! User: ${userId}, Budget: ${budget.id}, ` +
            `Limit: ${budget.limitAmount}, Spent: ${newSpentAmount}`,
          );
        }
        break;
      }
    }

    if (!updated) {
      this.logger.warn(
        `No budget updated for categoryId=${categoryIdNum}. ` +
        `Found ${budgets.length} budgets but none matched the period. ` +
        `Transaction date: ${transactionDate.toISOString()}`
      );
    }
  }

  async rollbackSpentAmountFromTransaction(
    userId: string,
    categoryId: string,
    amount: number,
    transactionDate: Date,
  ): Promise<void> {
    // Đảm bảo amount là number hợp lệ
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      this.logger.warn(`Invalid amount: ${amount}, skipping budget rollback`);
      return;
    }

    const categoryIdNum = parseInt(categoryId, 10);
    if (isNaN(categoryIdNum)) {
      this.logger.warn(`Invalid categoryId: ${categoryId}`);
      return;
    }

    // Filter theo userId và categoryId
    const budgets = await this.budgetRepository.find({
      where: {
        userId: userId,
        categoryId: categoryIdNum
      },
    });

    for (const budget of budgets) {
      if (this.isDateInPeriod(transactionDate, budget.period)) {
        const oldSpentAmount = budget.spentAmount;

        // Atomic SQL update với GREATEST để đảm bảo không bị âm
        await this.budgetRepository
          .createQueryBuilder()
          .update(Budget)
          .set({ spentAmount: () => 'GREATEST(0, spentAmount - :amount)' })
          .setParameter('amount', amount)
          .where('id = :budgetId', { budgetId: budget.id })
          .execute();

        const newSpentAmount = Math.max(0, oldSpentAmount - amount);

        this.logger.log(
          `Rolled back budget atomically: Budget ${budget.id}, -${amount}, spent: ${oldSpentAmount} -> ${newSpentAmount}`,
        );
        break;
      }
    }
  }

  private isDateInPeriod(date: Date, period: BudgetPeriod): boolean {
    const now = new Date();
    const transactionYear = date.getFullYear();
    const transactionMonth = date.getMonth();
    const transactionDay = date.getDate();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDay = now.getDate();

    switch (period) {
      case BudgetPeriod.WEEKLY:
        // Tính đầu tuần (Chủ nhật) và cuối tuần (Thứ 7)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Chủ nhật
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Thứ 7
        endOfWeek.setHours(23, 59, 59, 999);

        const transactionDateOnly = new Date(date);
        transactionDateOnly.setHours(0, 0, 0, 0);

        const isInWeek = transactionDateOnly >= startOfWeek && transactionDateOnly <= endOfWeek;
        this.logger.log(
          `WEEKLY check: transaction=${transactionDateOnly.toISOString()}, startOfWeek=${startOfWeek.toISOString()}, endOfWeek=${endOfWeek.toISOString()}, isInWeek=${isInWeek}`
        );
        return isInWeek;
      case BudgetPeriod.MONTHLY:
        // Kiểm tra transaction date có cùng tháng và năm với hiện tại không
        const isInMonth = transactionMonth === nowMonth && transactionYear === nowYear;
        this.logger.log(
          `MONTHLY check: transaction=${transactionMonth}/${transactionYear}, now=${nowMonth}/${nowYear}, isInMonth=${isInMonth}`
        );
        return isInMonth;
      case BudgetPeriod.YEARLY:
        // Kiểm tra transaction date có cùng năm với hiện tại không
        const isInYear = transactionYear === nowYear;
        this.logger.log(
          `YEARLY check: transaction=${transactionYear}, now=${nowYear}, isInYear=${isInYear}`
        );
        return isInYear;
      default:
        return false;
    }
  }
}
