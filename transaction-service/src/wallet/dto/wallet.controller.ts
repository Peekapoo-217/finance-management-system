import { Controller, Post, Body, Get, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './create-wallet.dto';


@Controller('wallets')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Post()
  create(@Body() dto: CreateWalletDto, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.walletService.create(userId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.walletService.findAll(userId);
  }
}