import { Controller, Get, Post, Body, Param, Put, Delete, Request, UseGuards } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
// Nếu nhóm đã có shared guard, import từ đó. Tạm mock nếu chưa
// import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@Controller('budgets')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  // Tạm bỏ guard để test dễ, sau này thêm lại
  // @UseGuards(JwtAuthGuard)

  @Post()
  create(@Body() dto: CreateBudgetDto, @Request() req: any) {
    const userId = req.user?.id || 1; // Mock userId khi chưa có auth
    return this.budgetService.create(userId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    const userId = req.user?.id || 1;
    return this.budgetService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || 1;
    return this.budgetService.findOne(+id, userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBudgetDto, @Request() req: any) {
    const userId = req.user?.id || 1;
    return this.budgetService.update(+id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || 1;
    return this.budgetService.remove(+id, userId);
  }
}