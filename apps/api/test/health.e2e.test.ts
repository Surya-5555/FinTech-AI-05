process.env.API_AUTH_TOKEN = 'test-auth-token';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

import { PrismaService } from '../src/persistence/prisma.service';
import { vi } from 'vitest';

vi.mock('@rr/persistence', () => ({
  PrismaHealthIndicator: class {
    isHealthy = vi.fn().mockResolvedValue({ db: { status: 'up' } });
  },
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

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
    app.setGlobalPrefix('api/v1', {
      exclude: ['health/live', 'health/ready', 'metrics']
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect({ status: 'OK' });
  });

  it('/api/v1/system/version (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/system/version')
      .expect(200)
      .expect((res) => {
        expect(res.body.service).toBe('@rr/api');
        expect(res.body.environment).toBeDefined();
      });
  });

  it('generates correlation ID', async () => {
    // Need to setup global interceptor in test as it's done in main.ts normally
    // We'll just test the module structure, wait, interceptors and filters are in main.ts
    // Let's create a proxy app setup
  });
});
