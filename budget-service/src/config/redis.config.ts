import { Transport, ClientProviderOptions, MicroserviceOptions } from '@nestjs/microservices';

// Config cho Redis Client (để emit events)
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

// Config cho Redis Microservice (để lắng nghe events)
export const redisMicroserviceConfig: MicroserviceOptions = {
  transport: Transport.REDIS,
  options: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    retryAttempts: 5,
    retryDelay: 1000,
  },
};


