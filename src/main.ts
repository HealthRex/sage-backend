import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import * as connectPgSimple from 'connect-pg-simple';
import * as pg from 'pg';

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

  // config sessions
  const pgPool = new pg.Pool({
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: true,
  });

  const PostgresStore: typeof connectPgSimple.PGStore =
    connectPgSimple(session);
  app.use(
    session({
      store: new PostgresStore({
        pool: pgPool,
        createTableIfMissing: true,
      }),
      // TODO might need to pass string[] here to be able to regularly change session secrets
      secret: process.env.SESSION_SECRET as string,
      resave: false,
      cookie: {
        sameSite: 'none',
        secure: false,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      saveUninitialized: false,
    }),
  );

  // config CORS
  const allowedOrigins: string[] = process.env.CORS_ORIGINS?.split(',') || [];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Set-Cookie'],
    exposeHeaders: ['Set-Cookie'],
    credentials: true,
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
