import { Controller, Logger, Inject } from '@nestjs/common';
import { EventPattern, Payload, ClientProxy } from '@nestjs/microservices';
import { BudgetService } from './budget.service';
import { CategoryService } from '../category/category.service';

@Controller()
export class BudgetEventsController {
  private readonly logger = new Logger(BudgetEventsController.name);

  constructor(
    private readonly budgetService: BudgetService,
    private readonly categoryService: CategoryService,
    @Inject('REDIS_SERVICE')
    private readonly redisClient: ClientProxy,
  ) { }


  @EventPattern('transaction.created')
  async handleTransactionCreated(@Payload() data: any) {
    const { userId, categoryName, amount, type, date, transactionId } = data;

    this.logger.log(
      `Received transaction.created event: userId=${userId}, categoryName=${categoryName}, amount=${amount} (type: ${typeof amount}), type=${type}`,
    );

    if (type !== 'expense') {
      this.logger.debug('Skipping non-expense transaction');
      return;
    }

    try {
      const amountNum = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        this.logger.warn(`Invalid amount received: ${amount}, skipping budget update`);
        return;
      }

      const category = await this.categoryService.findByName(categoryName);

      if (!category) {
        this.logger.warn(`Category not found in Budget Service: ${categoryName}`);

        this.redisClient.emit('transaction.budget_update_failed', {
          transactionId: transactionId,
          userId: userId,
          categoryName: categoryName,
          error: `Category "${categoryName}" not found in Budget Service`,
          reason: 'category_not_found'
        });
        return;
      }

      this.logger.log(
        `Updating budget: userId=${userId}, categoryId=${category.id}, amount=${amountNum}, date=${date}`
      );
      await this.budgetService.updateSpentAmountFromTransaction(
        userId,
        category.id.toString(),
        amountNum,
        new Date(date),
      );
      this.logger.log(`Budget updated successfully for category: ${categoryName}, added amount: ${amountNum}`);

      this.redisClient.emit('transaction.budget_updated', {
        transactionId: transactionId,
        userId: userId,
        categoryName: categoryName,
        amount: amountNum,
        success: true
      });

    } catch (error) {
      this.logger.error(`Failed to update budget: ${error.message}`, error.stack);

      this.redisClient.emit('transaction.budget_update_failed', {
        transactionId: transactionId,
        userId: userId,
        categoryName: categoryName,
        error: error.message,
        reason: 'update_failed'
      });
    }
  }

  @EventPattern('transaction.deleted')
  async handleTransactionDeleted(@Payload() data: any) {
    const { userId, categoryName, amount, type, date } = data;

    this.logger.log(
      `Received transaction.deleted event: userId=${userId}, categoryName=${categoryName}, amount=${amount}, type=${type}`,
    );

    if (type !== 'expense') {
      this.logger.debug('Skipping non-expense transaction delete');
      return;
    }

    try {
      const category = await this.categoryService.findByName(categoryName);
      if (!category) {
        this.logger.warn(`Category not found in Budget Service: ${categoryName}`);
        return;
      }

      await this.budgetService.rollbackSpentAmountFromTransaction(
        userId,
        category.id.toString(),
        amount,
        new Date(date),
      );
      this.logger.log(`Budget rolled back successfully for category: ${categoryName}`);
    } catch (error) {
      this.logger.error(`Failed to rollback budget: ${error.message}`, error.stack);
    }
  }

  @EventPattern('transaction.updated')
  async handleTransactionUpdated(@Payload() data: any) {
    const { userId, oldData, newData } = data;

    this.logger.log(
      `Received transaction.updated event: userId=${userId}, oldAmount=${oldData.amount}, newAmount=${newData.amount}`,
    );

    try {
      // Bước 1: Rollback budget của transaction cũ (nếu là expense)
      if (oldData.type === 'expense') {
        const oldCategory = await this.categoryService.findByName(oldData.categoryName);
        if (oldCategory) {
          await this.budgetService.rollbackSpentAmountFromTransaction(
            userId,
            oldCategory.id.toString(),
            oldData.amount,
            new Date(oldData.date),
          );
          this.logger.log(`Rolled back old budget for category: ${oldData.categoryName}`);
        }
      }

      // Bước 2: Cập nhật budget của transaction mới (nếu là expense)
      if (newData.type === 'expense') {
        const newCategory = await this.categoryService.findByName(newData.categoryName);
        if (!newCategory) {
          this.logger.warn(`Category not found in Budget Service: ${newData.categoryName}`);
          return;
        }

        await this.budgetService.updateSpentAmountFromTransaction(
          userId,
          newCategory.id.toString(),
          newData.amount,
          new Date(newData.date),
        );
        this.logger.log(`Updated new budget for category: ${newData.categoryName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update budget: ${error.message}`, error.stack);
    }
  }
}

