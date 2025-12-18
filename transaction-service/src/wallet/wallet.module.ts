import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Wallet } from '../transaction/entities/wallet.entity';
import { WalletController } from '../wallet/dto/wallet.controller';
import { WalletService } from '../wallet/dto/wallet.service';
import { AuthServiceGuard } from '../auth/guards/auth-service.guard';
import { ConsulClientService } from '../consul/consul-client.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet]),
    HttpModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, AuthServiceGuard, ConsulClientService],
})
export class WalletModule {}