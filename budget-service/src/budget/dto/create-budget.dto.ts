import { IsNumber, IsPositive, IsEnum, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BudgetPeriod } from '../enums/budget-period.enum';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'ID of the category for this budget',
    example: 1,
    type: Number,
  })
  @IsInt()
  categoryId: number;

  @ApiProperty({
    description: 'Maximum amount limit for this budget period',
    example: 5000000,
    type: Number,
  })
  @IsNumber()
  @IsPositive()
  limitAmount: number;

  @ApiProperty({
    description: 'Budget period type',
    enum: BudgetPeriod,
    example: BudgetPeriod.MONTHLY,
  })
  @IsEnum(BudgetPeriod)
  period: BudgetPeriod;
}