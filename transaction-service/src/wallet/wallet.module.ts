import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from '../transaction/entities/wallet.entity';
import { WalletController } from '../wallet/dto/wallet.controller';
import { WalletService } from '../wallet/dto/wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet])],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}