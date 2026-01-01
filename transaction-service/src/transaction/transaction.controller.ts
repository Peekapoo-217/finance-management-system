import { Controller, Get, Post, Body, Param, Put, Delete, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AuthServiceGuard } from '../auth/guards/auth-service.guard';


@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(AuthServiceGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() dto: CreateTransactionDto, @Request() req: any) {
    const userId = req.user?.userId || 'test-user-id';
    const authToken = req.headers.authorization;
    return this.transactionService.create(userId, dto, authToken);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions for authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns list of all transactions' })
  findAll(@Request() req: any) {
    const userId = req.user?.userId || 'test-user-id';
    return this.transactionService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Returns the transaction' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId || 'test-user-id';
    return this.transactionService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing transaction' })
  @ApiResponse({ status: 200, description: 'Transaction updated successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto, @Request() req: any) {
    const userId = req.user?.userId || 'test-user-id';
    return this.transactionService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiResponse({ status: 200, description: 'Transaction deleted successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId || 'test-user-id';
    return this.transactionService.remove(id, userId);
  }
}