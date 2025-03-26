import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'development' ? ['debug'] : ['error', 'warn'],
  });

  // config Validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  // config CORS
  app.enableCors({
    origin: '*', // TODO Allow only frontend origin
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  });

  // config Swagger
  const config = new DocumentBuilder()
    .setTitle('Referral service')
    .setDescription('The Referral service API description')
    .setVersion('1.0')
    .addTag('referral-service')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
