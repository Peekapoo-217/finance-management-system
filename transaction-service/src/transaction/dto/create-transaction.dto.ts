import { IsUUID, IsNumber, IsPositive, IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';
import { CategoryType } from '../enums';

export class CreateTransactionDto {
  @IsOptional()
  @IsUUID()
  walletId?: string;

  // Cho phép gửi categoryId hoặc categoryName + categoryType
  // Cho phép gửi categoryId (UUID) hoặc không gửi để dùng categoryName + categoryType.
  // Không ép UUID để tránh lỗi khi FE gửi id số (từ budget-service).
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsEnum(CategoryType)
  categoryType?: CategoryType;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  transactionDate: string;

  @IsOptional()
  @IsString()
  description?: string;
}