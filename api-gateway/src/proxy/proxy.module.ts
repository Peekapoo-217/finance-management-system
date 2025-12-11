import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ProxyService } from './proxy.service';
import { ProxyController } from './proxy.controller';
import { ConsulClientModule } from '../consul/consul-client.module';

@Module({
    imports: [
        ConfigModule,
        ConsulClientModule,
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),
    ],
    controllers: [ProxyController],
    providers: [ProxyService],
    exports: [ProxyService],
})
export class ProxyModule { }
