import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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
      tags: ['auth', 'nestjs', 'microservice'],
      meta: {
        version: '1.0.0',
        description: 'Authentication Service',
      },
      check: {
        http: `http://127.0.0.1:${port}/auth/health`,
        interval: '10s',
        timeout: '5s',
        deregisterCriticalServiceAfter: '1m',
      },
    });
    logger.log(`Registered to Consul: ${serviceId}`);
  } catch (error) {
    logger.error(`Failed to register to Consul: ${error.message}`);
  }
}

async function deregisterFromConsul(
  serviceId: string,
  registryUrl: string,
  logger: Logger,
) {
  try {
    await axios.delete(`${registryUrl}/consul/services/${serviceId}`);
    logger.log(`Deregistered from Consul: ${serviceId}`);
  } catch (error) {
    logger.error(`Failed to deregister from Consul: ${error.message}`);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());

  const port = configService.get<number>('PORT', 3001);
  const registryUrl = configService.get<string>(
    'REGISTRY_URL',
    'http://localhost:3100',
  );
  const serviceId = `auth-service-${port}`;
  const serviceName = 'auth-service';

  await app.listen(port);
  logger.log(`Auth Service is running on: http://localhost:${port}`);
  logger.log(`Health Check: http://localhost:${port}/auth/health`);

  // Register to Consul
  await registerToConsul(serviceId, serviceName, port, registryUrl, logger);

  // Graceful shutdown
  const shutdown = async () => {
    logger.log('Shutting down Auth Service...');
    await deregisterFromConsul(serviceId, registryUrl, logger);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
bootstrap();
