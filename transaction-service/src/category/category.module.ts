import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../transaction/entities/category.entity';
import { CategoryController } from './dto/category.controller';
import { CategoryService } from './dto/category.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}