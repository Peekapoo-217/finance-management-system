import { IsString, IsOptional } from 'class-validator';

export class CreateReportDto {
  @IsOptional()
  @IsString()
  category?: string;  
}