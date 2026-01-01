import { IsUUID, IsNumber, IsPositive, IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '../enums';


export class CreateTransactionDto {
  @ApiPropertyOptional({
    description: 'Wallet ID for the transaction',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  walletId?: string;

  @ApiPropertyOptional({
    description: 'Category ID (can be number or UUID)',
    example: '1',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Category name (alternative to categoryId)',
    example: 'Food',
  })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional({
    description: 'Category type',
    enum: CategoryType,
    example: CategoryType.EXPENSE,
  })
  @IsOptional()
  @IsEnum(CategoryType)
  categoryType?: CategoryType;

  @ApiProperty({
    description: 'Transaction amount',
    example: 50000,
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Transaction date in ISO format',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  transactionDate: string;

  @ApiPropertyOptional({
    description: 'Optional description for the transaction',
    example: 'Lunch at restaurant',
  })
  @IsOptional()
  @IsString()
  description?: string;
}