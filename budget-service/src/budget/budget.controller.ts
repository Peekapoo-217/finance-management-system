import { Controller, Get, Post, Body, Param, Put, Delete, Request, UseGuards, UnauthorizedException } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { AuthServiceGuard } from '../auth/guards/auth-service.guard';

@Controller('budgets')
@UseGuards(AuthServiceGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  create(@Body() dto: CreateBudgetDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.budgetService.create(userId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.budgetService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.budgetService.findOne(id, userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBudgetDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.budgetService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.budgetService.remove(id, userId);
  }

  @Get('check/:categoryName')
  async checkBudget(@Param('categoryName') categoryName: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    const hasBudget = await this.budgetService.hasBudgetForCategory(userId, categoryName);
    return { hasBudget, categoryName };
  }
}