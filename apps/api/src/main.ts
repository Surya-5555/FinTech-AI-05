(BigInt.prototype as any).toJSON = function () { return this.toString(); };
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  const configService = app.get(ConfigService);
  const logger = app.get(Logger);
  
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.useGlobalInterceptors(new CorrelationIdInterceptor());
  
  app.setGlobalPrefix('api/v1', {
    exclude: ['health/live', 'health/ready', 'metrics']
  });

  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Security
  app.use(helmet());
  
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const originsArray = corsOrigins ? corsOrigins.split(',') : ['http://localhost:3000', 'http://localhost:5173'];
  app.enableCors({
    origin: originsArray,
  });

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false }
  }));

  // Exceptions
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // Swagger
  const env = configService.get<string>('APP_ENV');
  if (env === 'development' || env === 'test') {
    // const config = new DocumentBuilder()
    //   .setTitle('Revenue Recovery API')
    //   .setDescription('API for AI Revenue Recovery System')
    //   .setVersion('1.0')
    //   .addBearerAuth()
    //   .build();
    // const document = SwaggerModule.createDocument(app, config);
    // SwaggerModule.setup('api/docs', app, document);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}

bootstrap();
