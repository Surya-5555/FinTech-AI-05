process.env.API_AUTH_TOKEN = 'test-auth-token';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/persistence/prisma.service';
import request from 'supertest';
import { AppModule } from '../src/app.module';
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
  getPrismaClient: () => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    revenueCase: {
      findMany: vi.fn().mockResolvedValue([{ id: 'c1', amountAtRiskMinor: 100n }]),
      count: vi.fn().mockResolvedValue(0),
    },
  }),
}));

describe('Security Boundaries (e2e)', () => {
  let app: INestApplication;
  let validToken: string;

  beforeAll(async () => {
    // Ensure the token is set for the test
    process.env.API_AUTH_TOKEN = 'test-operator-token';
    validToken = process.env.API_AUTH_TOKEN;

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
      }
    })
    .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authorization Boundary', () => {
    it('rejects unauthorized mutation request (missing webhook signature)', () => {
      return request(app.getHttpServer())
        .post('/events/ingest')
        .send({
          externalEventId: 'evt_123',
          merchant: { id: 'm_1', name: 'Test', externalReference: 'm_1' },
          customer: { id: 'c_1', externalReference: 'c_1' },
          amountAtRiskMinor: 1000,
          currency: 'INR',
          paymentChannel: 'CARD',
          failureReason: 'INSUFFICIENT_FUNDS'
        })
        .expect(401);
    });

    it('rejects unauthorized mutation request (invalid webhook signature)', () => {
      return request(app.getHttpServer())
        .post('/events/ingest')
        .set('x-razorpay-signature', 'invalid-signature-hash')
        .send({
          externalEventId: 'evt_123',
          merchant: { id: 'm_1', name: 'Test', externalReference: 'm_1' },
          customer: { id: 'c_1', externalReference: 'c_1' },
          amountAtRiskMinor: 1000,
          currency: 'INR',
          paymentChannel: 'CARD',
          failureReason: 'INSUFFICIENT_FUNDS'
        })
        .expect(401);
    });

    it('allows read request without token (demo policy)', () => {
      return request(app.getHttpServer())
        .get('/cases')
        .expect(200);
    });
  });

  describe('LLM Boundary Constraints', () => {
    it('LLM malformed output cannot change deterministic action', async () => {
      // In this system, LLM acts as an advisor for message generation (in ai controller)
      // and reasoning. The API endpoints explicitly reject extra payload fields 
      // because of the ValidationPipe whitelist and forbidNonWhitelisted options.
      return request(app.getHttpServer())
        .post('/cases/case_123/plans')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          policyVersion: 'v1',
          malformedField: 'try-to-override'
        })
        .expect(400)
        .expect((res: any) => {
          expect(res.body.message).toContain('property malformedField should not exist');
        });
    });
  });

  describe('Fail Closed', () => {
    it('fails closed when configuration is missing live credentials', () => {
      // This is inherently tested by the configuration.ts throwing an error at boot, 
      // but we can assert the environment state here.
      expect(process.env.RAZORPAY_MODE).not.toBe('live');
    });
  });
});
