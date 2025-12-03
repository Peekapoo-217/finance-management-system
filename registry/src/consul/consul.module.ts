import { DynamicModule, Module } from '@nestjs/common';
import { ConsulService } from './consul.service';
import { ConsulConfig } from './consul.config';

@Module({})
export class ConsulModule {
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<ConsulConfig> | ConsulConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: ConsulModule,
      providers: [
        {
          provide: 'CONSUL_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: ConsulService,
          useFactory: async (config: ConsulConfig) => {
            return new ConsulService(config);
          },
          inject: ['CONSUL_CONFIG'],
        },
      ],
      exports: [ConsulService],
      global: true,
    };
  }
}

