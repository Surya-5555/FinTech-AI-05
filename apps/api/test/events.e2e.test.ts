process.env.API_AUTH_TOKEN = 'test-auth-token';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import crypto from 'crypto';

vi.mock('@rr/persistence', () => {
  return {
    PlanningRepository: class {},
    IngestionRepository: class {},
    OutboxRepository: class {},
    ExecutionRepository: class {},
    PrismaPlanningRepository: class {},
    PrismaOutboxRepository: class {},
    PrismaExecutionRepository: class {},
    AIInvocationRepository: class {},
    PrismaAIInvocationRepository: class {},
    ConcurrencyConflictError: class ConcurrencyConflictError extends Error {},
    getPrismaClient: () => ({
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    }),
    PrismaIngestionRepository: vi.fn().mockImplementation(() => {
      return {
        ingestEventAndCreateCaseIfEligible: vi.fn().mockResolvedValue({
          correlationId: 'mock-correlation-id',
          idempotentReplay: false,
          qualification: {
            eligible: true,
            reasonCodes: []
          },
          revenueCase: {
            caseId: 'mock-case'
          }
        })
      };
    })
  };
});

import { PrismaService } from '../src/persistence/prisma.service';

describe('EventsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
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
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/events/ingest (POST) - Valid request', async () => {
    const payload = {
      externalEventId: `test_evt_${Date.now()}`,
      merchant: {
        externalReference: 'merch_test_1',
        name: 'Test Merchant',
        segment: 'subscription'
      },
      customer: {
        externalReference: 'cust_test_1',
        maskedReference: 'test_user',
        consents: {
          email: 'GRANTED',
          sms: 'GRANTED',
          voice: 'UNKNOWN'
        }
      },
      eventType: 'PAYMENT_FAILED',
      occurredAt: new Date().toISOString(),
      amount: {
        amountMinor: '49900',
        currency: 'INR'
      },
      failureReason: 'INSUFFICIENT_FUNDS'
    };

    const payloadString = JSON.stringify(payload);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

    const response = await request(app.getHttpServer())
      .post('/events/ingest')
      .set('x-razorpay-signature', signature)
      .set('Idempotency-Key', `idemp_${Date.now()}`)
      .send(payload)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('correlationId');
    expect(response.body).toHaveProperty('caseCreated');
  });
});
