import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BudgetService } from '../budget.service';

@Injectable()
export class TransactionListener {
  constructor(private budgetService: BudgetService) {}

  @OnEvent('transaction.created', { async: true })
  async handleTransactionCreated(payload: any) {
    const { userId, categoryId, amount, type, date } = payload;

    // Chỉ xử lý chi tiêu
    if (type !== 'expense') return;

    await this.budgetService.updateSpentAmountFromTransaction(
      userId,
      categoryId,
      amount,
      new Date(date),
    );
  }
}