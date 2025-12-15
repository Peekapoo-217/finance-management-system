import { IsString, IsOptional, IsNumber, IsPositive } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  balance?: number = 0;

  @IsOptional()
  @IsString()
  type?: string; // cash, bank, e-wallet

  @IsOptional()
  @IsString()
  currency?: string = 'VND';
}