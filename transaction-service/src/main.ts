import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { redisMicroserviceConfig } from './config/redis.config';

async function registerToConsul(
  serviceId: string,
  serviceName: string,
  port: number,
  registryUrl: string,
  logger: Logger,
) {
  try {
    await axios.post(`${registryUrl}/consul/services/register`, {
      id: serviceId,
      name: serviceName,
      address: '127.0.0.1',
      port: port,
      tags: ['transaction', 'nestjs', 'microservice'],
      meta: {
        version: '1.0.0',
        description: 'Transaction Management Service',
      },
      check: {
        http: `http://127.0.0.1:${port}/health`,
        interval: '10s',
        timeout: '5s',
        deregisterCriticalServiceAfter: '1m',
      },
    });
  } catch (error) {
    // Silent error
  }
}

async function deregisterFromConsul(
  serviceId: string,
  registryUrl: string,
  logger: Logger,
) {
  try {
    await axios.delete(`${registryUrl}/consul/services/${serviceId}`);
  } catch (error) {
    // Silent error
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Kết nối Redis microservice để lắng nghe events
  app.connectMicroservice(redisMicroserviceConfig);
  await app.startAllMicroservices();
  logger.log('Redis microservice connected for event listening');

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }));

  const port = configService.get<number>('PORT', 3003);
  const registryUrl = configService.get<string>(
    'REGISTRY_URL',
    'http://localhost:3100',
  );
  const serviceId = `transaction-service-${port}`;
  const serviceName = 'transaction-service';

  await app.listen(port);
  logger.log(`Transaction Service is running on: http://localhost:${port}`);
  logger.log(`Health Check: http://localhost:${port}/health`);

  // Register to Consul
  await registerToConsul(serviceId, serviceName, port, registryUrl, logger);

  // Graceful shutdown
  const shutdown = async () => {
    await deregisterFromConsul(serviceId, registryUrl, logger);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
bootstrap();
