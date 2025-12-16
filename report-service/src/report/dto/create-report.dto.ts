import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateReportDto {
  @IsNotEmpty()
  @IsString()
  period: string;  // e.g., '2025-01'

  @IsOptional()
  @IsString()
  category?: string;  
}