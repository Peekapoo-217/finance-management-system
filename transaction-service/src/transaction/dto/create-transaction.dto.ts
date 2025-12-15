import { IsUUID, IsNumber, IsPositive, IsDate, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsUUID()
  walletId: string;

  @IsUUID()
  categoryId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDate()
  transactionDate: String;

  @IsOptional()
  @IsString()
  description?: string;
}