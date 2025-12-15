import { IsString, IsEnum } from 'class-validator';
import { CategoryType } from 'src/transaction/enums/category-type.enum';


export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsEnum(CategoryType)
  type: CategoryType; // 'income' or 'expense'
}