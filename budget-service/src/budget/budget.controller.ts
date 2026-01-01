import { Controller, Get, Post, Body, Param, Put, Delete, Request, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { AuthServiceGuard } from '../auth/guards/auth-service.guard';

@ApiTags('budgets')
@ApiBearerAuth()
@Controller('budgets')
@UseGuards(AuthServiceGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new budget' })
  @ApiResponse({ status: 201, description: 'Budget created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateBudgetDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.budgetService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all budgets for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns list of all budgets' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.budgetService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget by ID' })
  @ApiResponse({ status: 200, description: 'Returns the budget' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.budgetService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing budget' })
  @ApiResponse({ status: 200, description: 'Budget updated successfully' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(@Param('id') id: string, @Body() dto: UpdateBudgetDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.budgetService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget and associated transactions' })
  @ApiResponse({ status: 200, description: 'Budget deleted successfully' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.budgetService.remove(id, userId);
  }

  @Get('check/:categoryName')
  @ApiOperation({ summary: 'Check if user has a budget for a specific category' })
  @ApiResponse({ status: 200, description: 'Returns whether budget exists for the category' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkBudget(@Param('categoryName') categoryName: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    const hasBudget = await this.budgetService.hasBudgetForCategory(userId, categoryName);
    return { hasBudget, categoryName };
  }
}