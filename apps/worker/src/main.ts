import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';
import { config } from 'dotenv';

config();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  // application context for workers
  console.log('Worker is running');
}

bootstrap();
