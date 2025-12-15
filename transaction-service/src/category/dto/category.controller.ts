import { Controller, Post, Body, Get, Request } from '@nestjs/common';

import { CreateCategoryDto } from '../dto/create-category.dto';
import { CategoryService } from './category.service';

@Controller('categories')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Post()
  create(@Body() dto: CreateCategoryDto, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.categoryService.create(userId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.categoryService.findAll(userId);
  }
}