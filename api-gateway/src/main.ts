import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('Unified API Gateway for Financial Management Microservices')
    .setVersion('1.0')
    .addTag('gateway', 'API Gateway endpoints')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Enable JSON body parser explicitly
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  const port = process.env.PORT ?? 3000;

  await app.listen(port);
  logger.log(`API Gateway is running on: http://localhost:${port}`);
  logger.log(`Swagger API Docs: http://localhost:${port}/api`);
  logger.log(`CORS enabled for frontend: http://localhost:5173`);
}
bootstrap();