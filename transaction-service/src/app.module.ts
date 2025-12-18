import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@nestjs/microservices';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { TransactionModule } from './transaction/transaction.module';
import { WalletModule } from './wallet/wallet.module';
import { CategoryModule } from './category/category.module';
import { ConsulClientService } from './consul/consul-client.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      inject: [ConfigService],
    }),
    ClientsModule.register([redisConfig]),
    HttpModule,
    TransactionModule,
    WalletModule,
    CategoryModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, ConsulClientService],
  exports: [ConsulClientService],
})
export class AppModule { }
