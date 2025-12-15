import { Controller, Logger, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BudgetService } from './budget.service';
import { CategoryService } from '../category/category.service';

@Controller()
export class BudgetEventsController {
  private readonly logger = new Logger(BudgetEventsController.name);

  constructor(
    private readonly budgetService: BudgetService,
    private readonly categoryService: CategoryService,
  ) {}

  @EventPattern('transaction.created')
  async handleTransactionCreated(@Payload() data: any) {
    const { userId, categoryName, amount, type, date } = data;

    this.logger.log(
      `Received transaction.created event: userId=${userId}, categoryName=${categoryName}, amount=${amount}, type=${type}`,
    );

    // Chỉ xử lý chi tiêu
    if (type !== 'expense') {
      this.logger.debug('Skipping non-expense transaction');
      return;
    }

    try {
      // Tìm category trong Budget Service database bằng name
      const category = await this.categoryService.findByName(categoryName);
      
      if (!category) {
        this.logger.warn(`Category not found in Budget Service: ${categoryName}`);
        return;
      }

      // Update budget với categoryId của Budget Service
      await this.budgetService.updateSpentAmountFromTransaction(
        userId,
        category.id.toString(),
        amount,
        new Date(date),
      );
      this.logger.log(`Budget updated successfully for category: ${categoryName}`);
    } catch (error) {
      this.logger.error(`Failed to update budget: ${error.message}`, error.stack);
    }
  }
}

