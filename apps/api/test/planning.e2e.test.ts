process.env.API_AUTH_TOKEN = 'test-auth-token';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PlanningModule } from '../src/modules/planning/planning.module';
import { PoliciesModule } from '../src/modules/policies/policies.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RecoveryPlanStatus, RevenueCaseState, InterventionType } from '@rr/contracts';

// Mock dependencies
vi.mock('@rr/persistence', () => {
  return {
    PlanningRepository: class {},
    getPrismaClient: () => ({
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    }),
    PrismaPlanningRepository: vi.fn().mockImplementation(() => {
      return {
        getCaseWithSourceEventAndMerchantPolicy: vi.fn().mockResolvedValue({
          revCase: {
            caseId: 'case_1',
            state: RevenueCaseState.DETECTED,
            amountAtRisk: { amountMinor: 1000n, currency: 'INR' },
            attemptCount: 0,
            merchantId: 'merch_1',
          },
          sourceEvent: {
            eventType: 'PAYMENT_FAILED',
            failureReason: 'NETWORK_ERROR',
            occurredAt: new Date(),
          },
          merchantPolicy: {
            policyVersion: 'v1',
            enabled: true,
            allowedInterventionTypes: [InterventionType.PAYMENT_RETRY, InterventionType.PAYMENT_LINK, InterventionType.EMAIL_REMINDER, InterventionType.SMS_REMINDER, InterventionType.HUMAN_ESCALATION, InterventionType.NO_ACTION],
            maxAttemptsPerCase: 3,
            maxRetryAmountMinor: 500000n,
            minimumRecoveryScore: 50,
            manualApprovalAboveAmountMinor: 1000000n,
            staleEventLimitHours: 24,
            contactRules: {
              messageWindowHours: 24
            }
          }
        }),
        getActiveInterventionSummary: vi.fn().mockResolvedValue({
          hasActivePaymentRetry: false,
          hasActivePaymentLink: false,
          hasActiveCommunication: false,
        }),
        createPlanWithPlanningOutcome: vi.fn().mockImplementation(async ({ plan, resultingCaseState }) => {
          return plan;
        }),
        listPlansForCase: vi.fn().mockResolvedValue([]),
      };
    })
  };
});

describe('PlanningController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PlanningModule, PoliciesModule, ConfigModule.forRoot({ isGlobal: true, load: [() => ({ API_AUTH_TOKEN: 'test-auth-token' })] })],
    })
    .overrideProvider(ConfigService)
    .useValue({ get: () => 'test-auth-token' })
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/cases/:caseId/plans (POST) - Success', async () => {
    const response = await request(app.getHttpServer())
      .post('/cases/case_1/plans')
      .set('Authorization', 'Bearer test-auth-token')
      .send({ policyVersion: 'v1' })
      .expect(201);

    expect(response.body).toHaveProperty('plan');
    expect(response.body.plan.planStatus).toBe(RecoveryPlanStatus.POLICY_APPROVED);
    expect(response.body.plan.interventionType).toBe(InterventionType.PAYMENT_RETRY);
    expect(response.body.resultingCaseState).toBe(RevenueCaseState.POLICY_CHECKED);
  });
});
