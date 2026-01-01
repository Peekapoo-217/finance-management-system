import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TransactionService } from './transaction.service';
import { DataSource } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { CategoryType } from './enums';

@Controller()
export class TransactionEventsController {
    private readonly logger = new Logger(TransactionEventsController.name);

    constructor(
        private readonly transactionService: TransactionService,
        private readonly dataSource: DataSource,
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

    /**
     * 
     * 
     */
    @EventPattern('transaction.budget_update_failed')
    async handleBudgetUpdateFailed(@Payload() data: any) {
        const { transactionId, userId, categoryName, error, reason } = data;

        this.logger.error(
            `Received budget update failure for transaction ${transactionId}: ${error}. Reason: ${reason}. Starting compensation...`
        );

        if (!transactionId) {
            this.logger.warn('Missing transactionId in compensation event, cannot rollback');
            return;
        }

        try {
            await this.dataSource.transaction(async (entityManager) => {
                const transaction = await entityManager.findOne(Transaction, {
                    where: { id: transactionId },
                    relations: ['wallet', 'category']
                });

                if (!transaction) {
                    this.logger.warn(
                        `Transaction ${transactionId} not found, may have been already compensated or deleted`
                    );
                    return;
                }

                const walletId = transaction.wallet.id;
                const amount = Number(transaction.amount);
                const categoryType = transaction.category.type;
                const oldBalance = Number(transaction.wallet.balance);

                if (categoryType === CategoryType.EXPENSE) {
                    transaction.wallet.balance = oldBalance + amount;
                    this.logger.debug(
                        `Wallet ${walletId}: Restoring ${amount} (expense compensation), ` +
                        `${oldBalance} -> ${transaction.wallet.balance}`
                    );
                } else {
                    transaction.wallet.balance = oldBalance - amount;
                    this.logger.debug(
                        `Wallet ${walletId}: Removing ${amount} (income compensation), ` +
                        `${oldBalance} -> ${transaction.wallet.balance}`
                    );
                }

                await entityManager.save(Wallet, transaction.wallet);
                await entityManager.remove(Transaction, transaction);

                this.logger.log(
                    `COMPENSATION COMPLETED: Transaction ${transactionId} deleted, ` +
                    `wallet ${walletId} balance restored from ${oldBalance} to ${transaction.wallet.balance}`
                );
            });

            this.logger.log(
                `Compensation successful for transaction ${transactionId} due to: ${reason}`
            );

        } catch (compensationError) {
            this.logger.error(
                `COMPENSATION FAILED for transaction ${transactionId}: ${compensationError.message}`,
                compensationError.stack
            );
            // TODO: Alert admin, add to dead letter queue, manual intervention needed
        }
    }
}
