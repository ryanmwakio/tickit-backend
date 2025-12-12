import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { FileLoggerService } from './common/services/logger.service';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const fileLogger = new FileLoggerService();

  const app = await NestFactory.create(AppModule, {
    logger: fileLogger,
  });
  const configService = app.get(ConfigService);

  // Log application startup
  fileLogger.log('TixHub Backend starting...', 'Bootstrap');

  // Security
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // CORS - Allow multiple origins for development
  const corsOrigin = configService.get('app.corsOrigin') || configService.get('CORS_ORIGIN');
  const allowedOrigins = corsOrigin 
    ? corsOrigin.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow localhost on any port
        if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global response transformation interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('TixHub API')
    .setDescription('Event & Ticketing Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('events', 'Event management')
    .addTag('tickets', 'Ticket operations')
    .addTag('orders', 'Order management')
    .addTag('payments', 'Payment processing')
    .addTag('organisers', 'Organiser management')
    .addTag('admin', 'Admin operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('app.port') || configService.get('PORT') || 5000;
  await app.listen(port);

  fileLogger.log(`TixHub API is running on: http://localhost:${port}`, 'Bootstrap');
  fileLogger.log(`Swagger docs available at: http://localhost:${port}/api/docs`, 'Bootstrap');

  console.log(`🚀 TixHub API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
  console.log(`📝 Logs are being written to: ${process.cwd()}/logs/`);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  const fileLogger = new FileLoggerService();
  fileLogger.error(
    `Uncaught Exception: ${error.message}`,
    error.stack,
    'UNCAUGHT_EXCEPTION',
  );
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  const fileLogger = new FileLoggerService();
  fileLogger.error(
    `Unhandled Rejection: ${reason}`,
    reason instanceof Error ? reason.stack : String(reason),
    'UNHANDLED_REJECTION',
  );
  console.error('Unhandled Rejection:', reason);
});

bootstrap();

