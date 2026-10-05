import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const server = express();

  server.use(
    '/uploads',
    express.static(
      join(process.cwd(), 'uploads'),
    ),
  );

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );

 app.enableCors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true,
  credentials: true,
});

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(
  Number(process.env.PORT || process.env.API_PORT || 3001),
  '0.0.0.0',
);
}

bootstrap();