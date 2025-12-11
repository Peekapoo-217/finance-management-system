import { Module, Global } from '@nestjs/common';
import { ConsulClientService } from './consul-client.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [ConsulClientService],
    exports: [ConsulClientService],
})
export class ConsulClientModule { }
