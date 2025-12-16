import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3001;
  const corsOrigins =
    config
      .get<string>('CORS_ORIGIN')
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? ['http://localhost:3000'];

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  await app.listen(port);
  console.log(`API listening on port ${port}`);
}

bootstrap();
