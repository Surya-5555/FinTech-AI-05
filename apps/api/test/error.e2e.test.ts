import { INestApplication, Controller, Get } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './setup';
import { PolicyViolationError } from '@rr/domain';
process.env.API_AUTH_TOKEN = 'test-auth-token';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { vi } from 'vitest';

vi.mock('@rr/persistence', () => ({
  PlanningRepository: class {},
  IngestionRepository: class {},
  OutboxRepository: class {},
  ExecutionRepository: class {},
  PrismaIngestionRepository: class {},
  PrismaPlanningRepository: class {},
  PrismaOutboxRepository: class {},
  PrismaExecutionRepository: class {},
  AIInvocationRepository: class {},
  PrismaAIInvocationRepository: class {},
  ConcurrencyConflictError: class ConcurrencyConflictError extends Error {},
  getPrismaClient: () => ({}),
}));
import { CorrelationIdInterceptor } from '../src/common/interceptors/correlation-id.interceptor';
import { Logger } from 'nestjs-pino';

@Controller('test-error')
class TestController {
  @Get('policy')
  policyError() {
    throw new PolicyViolationError('Not allowed');
  }
  @Get('internal')
  internalError() {
    throw new Error('Boom');
  }
}

import { PrismaService } from '../src/persistence/prisma.service';

describe('Error Handling (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestController]
    })
    .overrideProvider(PrismaService)
    .useValue({
      onModuleInit: vi.fn(),
      onModuleDestroy: vi.fn(),
      client: {
        $connect: vi.fn(),
        $disconnect: vi.fn(),
        $queryRaw: vi.fn().mockResolvedValue([{}]),
      }
    })
    .compile();

    app = moduleFixture.createNestApplication();
    const logger = app.get(Logger);
    app.useGlobalInterceptors(new CorrelationIdInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter(logger));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('handles PolicyViolationError', () => {
    return request(app.getHttpServer())
      .get('/test-error/policy')
      .expect(422)
      .expect((res) => {
        expect(res.body.error.code).toBe('POLICY_VIOLATION');
        expect(res.body.error.message).toBe('Not allowed');
        expect(res.body.error.correlationId).toBeDefined();
      });
  });

  it('handles unexpected errors safely without leaking stack', () => {
    return request(app.getHttpServer())
      .get('/test-error/internal')
      .expect(500)
      .expect((res) => {
        expect(res.body.error.code).toBe('INTERNAL_ERROR');
        expect(res.body.error.message).toBe('An unexpected error occurred');
        expect(res.body.error.correlationId).toBeDefined();
        expect(res.body.error.stack).toBeUndefined();
      });
  });
  
  it('preserves incoming correlation id', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .set('x-correlation-id', 'my-custom-id')
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-correlation-id']).toBe('my-custom-id');
      });
  });
});
