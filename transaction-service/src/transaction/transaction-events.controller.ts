import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TransactionService } from './transaction.service';

@Controller()
export class TransactionEventsController {
    private readonly logger = new Logger(TransactionEventsController.name);

    constructor(
        private readonly transactionService: TransactionService,
    ) { }

    @EventPattern('budget.deleted')
    async handleBudgetDeleted(@Payload() data: any) {
        const { userId, budgetId, categoryName, categoryId } = data;

        this.logger.log(
            `Received budget.deleted event: budgetId=${budgetId}, userId=${userId}, category=${categoryName}`,
        );

        if (!userId || !categoryName) {
            this.logger.warn('Missing required fields in budget.deleted event');
            return;
        }

        try {
            const result = await this.transactionService.cascadeDeleteByCategory(
                userId,
                categoryName,
            );

            this.logger.log(
                `Cascade delete completed for category "${categoryName}": ` +
                `deleted=${result.deletedCount} transactions, rollback=${result.totalRollback} VND`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to cascade delete transactions for category "${categoryName}": ${error.message}`,
                error.stack,
            );
        }
    }
}
