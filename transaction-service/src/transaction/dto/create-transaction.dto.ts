import { IsUUID, IsNumber, IsPositive, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsUUID()
  walletId: string;

  @IsUUID()
  categoryId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  transactionDate: string;

  @IsOptional()
  @IsString()
  description?: string;
}