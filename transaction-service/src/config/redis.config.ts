import { Transport, ClientProviderOptions } from '@nestjs/microservices';

export const redisConfig: ClientProviderOptions = {
  name: 'REDIS_SERVICE',
  transport: Transport.REDIS,
  options: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    retryAttempts: 5,
    retryDelay: 1000,
  },
};

