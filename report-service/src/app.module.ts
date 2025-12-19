import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@nestjs/microservices';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { ReportModule } from './report/report.module';
import { HealthModule } from './health/health.module'; 
import { ConsulClientService } from './consul/consul-client.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => databaseConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([]),
    ClientsModule.register([redisConfig]),
    HttpModule,
    ReportModule,
    HealthModule, 
  ],
  controllers: [AppController],
  providers: [AppService, ConsulClientService],
  exports: [ConsulClientService],
})
export class AppModule {}