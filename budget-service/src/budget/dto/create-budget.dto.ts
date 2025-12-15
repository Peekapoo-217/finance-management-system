import { IsNumber, IsPositive, IsEnum, IsInt } from 'class-validator';
import { BudgetPeriod } from '../enums/budget-period.enum';

export class CreateBudgetDto {
  @IsInt()
  categoryId: number;

  @IsNumber()
  @IsPositive()
  limitAmount: number;

 @IsEnum(BudgetPeriod)
  period: BudgetPeriod;
}