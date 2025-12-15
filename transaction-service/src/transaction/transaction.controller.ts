import { Controller, Get, Post, Body, Param, Put, Delete, Request } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  create(@Body() dto: CreateTransactionDto, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id'; // Thay bằng JWT khi có auth
    return this.transactionService.create(userId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.transactionService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.transactionService.findOne(id, userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.transactionService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.transactionService.remove(id, userId);
  }
}