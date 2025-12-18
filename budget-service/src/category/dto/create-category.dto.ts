import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { CategoryType } from '../enums/category-type.enum';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(CategoryType)
  type: CategoryType;

  @IsString()
  @IsOptional()
  description?: string;
}

