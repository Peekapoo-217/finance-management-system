import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      order: { type: 'ASC', name: 'ASC' },
    });
  }

  async findByName(name: string): Promise<Category | null> {
    return this.categoryRepository.findOne({
      where: { name },
    });
  }
}

