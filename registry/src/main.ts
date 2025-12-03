import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors();

  const port = configService.get<number>('PORT', 3100);

  await app.listen(port);
  logger.log(`Registry Service is running on: http://localhost:${port}`);
  logger.log(`Consul Health Check: http://localhost:${port}/consul/health`);
  logger.log(`Consul Services: http://localhost:${port}/consul/services`);
}
bootstrap();
