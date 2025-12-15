import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from 'src/transaction/entities/category.entity';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './create-category.dto';


@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create({
      ...dto,
      userId,
    });
    return this.categoryRepository.save(category);
  }

  async findAll(userId: string): Promise<Category[]> {
  return this.categoryRepository.find();  // Bỏ filter tạm thời
}
}