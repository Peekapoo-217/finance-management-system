import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConsulModule } from './consul/consul.module';
import { ConsulController } from './consul/consul.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ConsulModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('CONSUL_HOST', 'localhost'),
        port: configService.get<number>('CONSUL_PORT', 8500),
        secure: false,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController, ConsulController],
  providers: [AppService],
})
export class AppModule {}
