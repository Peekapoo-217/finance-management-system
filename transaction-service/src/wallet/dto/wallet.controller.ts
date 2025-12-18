import { Controller, Post, Body, Get, Put, Param, Request, UseGuards, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './create-wallet.dto';
import { UpdateWalletDto } from './update-wallet.dto';
import { AuthServiceGuard } from '../../auth/guards/auth-service.guard';


@Controller('wallets')
@UseGuards(AuthServiceGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Post()
  create(@Body() dto: CreateWalletDto, @Request() req: any) {
    const userId = req.user?.userId || 'test-user-id';
    return this.walletService.create(userId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    const userId = req.user?.userId || 'test-user-id';
    return this.walletService.findAll(userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWalletDto, @Request() req: any) {
    const userId = req.user?.userId || 'test-user-id';
    return await this.walletService.update(id, userId, dto);
  }
}