import { Test, TestingModule } from '@nestjs/testing';
process.env.RAZORPAY_MODE = 'test';
process.env.ENABLE_RAZORPAY_TEST_MODE = 'true';
process.env.API_AUTH_TOKEN = 'test-auth-token';
process.env.RAZORPAY_KEY_ID = 'rzp_test_valid_dummy_key';
process.env.RAZORPAY_KEY_SECRET = 'valid_secret';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import crypto, { randomUUID } from 'crypto';
import { expect, test, describe, beforeAll, afterAll } from 'vitest';

import { AppModule } from '../../apps/api/src/app.module';
import { WorkerModule } from '../../apps/worker/src/worker.module';
import { getPrismaClient } from '../../libs/persistence/src';
import { RevenueCaseState } from '../../libs/contracts/src';

describe('Phase 2: End-to-End Golden Path', () => {
  let apiApp: INestApplication;
  let workerApp: INestApplication;
  const prisma = getPrismaClient();

  const merchantRef = `merch_test_${randomUUID()}`;
  const customerRef = `cust_test_${randomUUID()}`;
  const externalEventId = `evt_test_${randomUUID()}`;

  beforeAll(async () => {
    // 1. Setup API App
    process.env.API_AUTH_TOKEN = 'test-auth-token';
    const apiModule: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    apiApp = apiModule.createNestApplication({ rawBody: true });
    apiApp.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await apiApp.init();

    // 2. Setup Worker App
    const workerModule: TestingModule = await Test.createTestingModule({
      imports: [WorkerModule],
    }).compile();

    workerApp = workerModule.createNestApplication();
    await workerApp.init();

    // 3. Setup Test Data (Merchant & Customer)
    await prisma.merchant.create({
      data: {
        id: `m_${randomUUID()}`,
        externalReference: merchantRef,
        name: 'E2E Golden Path Merchant',
        segment: 'test',
        status: 'ACTIVE',
        configJson: JSON.stringify({
          policyVersion: '1.0',
          enabled: true,
          minimumAmountMinor: 100n.toString(),
          supportedCurrencies: ['INR'],
          eventMaxAgeHours: 720,
          supportedEventTypes: ['PAYMENT_FAILED'],
          excludedMerchantSegments: [],
          allowedInterventionTypes: ['PAYMENT_RETRY', 'PAYMENT_LINK', 'EMAIL_REMINDER', 'SMS_REMINDER', 'VOICE_REMINDER', 'HUMAN_ESCALATION'],
          maxAttemptsPerCase: 3,
          minimumRecoveryScore: 50,
          maxRetryAmountMinor: 100000n.toString(),
          manualApprovalAboveAmountMinor: 200000n.toString(),
        })
      }
    });

    await prisma.customer.create({
      data: {
        id: `c_${randomUUID()}`,
        merchantId: merchantRef, 
        externalReference: customerRef,
        displayNameOrMaskedReference: 'e2e_cust_1234',
        consentEmail: 'true',
        consentSms: 'true',
        consentVoice: 'false',
        contactWindowMetadataJson: '{}'
      }
    });

    // No separate policy table, merchant configJson stores the rules.
  });

  afterAll(async () => {
    await apiApp.close();
    await workerApp.close();
  });

  test('Complete flow: Webhook -> API -> DB -> Outbox -> Planning -> Queue -> Worker -> Adapter -> RECOVERED', async () => {
    const { randomUUID } = await import('crypto');
    const eventId = `evt_ext_${randomUUID()}`;
    
    // 1. Send the Webhook to the API
    const payload = {
      externalEventId: eventId,
      merchant: {
        externalReference: merchantRef,
        name: 'Golden Path Merchant',
        segment: 'subscription'
      },
      customer: {
        externalReference: customerRef,
        maskedReference: 'test_user',
        consents: { email: 'GRANTED', sms: 'GRANTED', voice: 'UNKNOWN' }
      },
      eventType: 'PAYMENT_FAILED',
      occurredAt: new Date().toISOString(),
      amount: { amountMinor: '50000', currency: 'INR' },
      failureReason: 'BANK_TIMEOUT' 
    };

    const payloadString = JSON.stringify(payload);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret';
    // ensure test env uses the same secret
    process.env.RAZORPAY_WEBHOOK_SECRET = secret; 
    
    const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

    const response = await request(apiApp.getHttpServer())
      .post('/events/ingest')
      .set('x-razorpay-signature', signature)
      .set('Idempotency-Key', `idemp_${randomUUID()}`)
      .set('x-razorpay-event-id', eventId)
      .send(payload);
      
    if (response.status !== 200) {
      console.log('Ingestion Failed:', response.body);
    }
    
    expect(response.status).toBe(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body.caseCreated).toBe(true);

    const caseId = response.body.caseId;
    expect(caseId).toBeDefined();

    // 1.5 Create Plan via API
    const planResponse = await request(apiApp.getHttpServer())
      .post(`/cases/${caseId}/plans`)
      .set('Authorization', `Bearer ${process.env.API_AUTH_TOKEN}`)
      .send({ policyVersion: '1.0' });
      
    if (planResponse.status !== 201) {
      console.log('Create Plan Failed:', planResponse.body);
    }
    
    expect(planResponse.status).toBe(201);
    expect(planResponse.body).toHaveProperty('plan');
    const planId = planResponse.body.plan.planId;
    console.log('Created Plan:', planResponse.body.plan);
    
    // 1.6 Enqueue Plan via API
    const enqueueResponse = await request(apiApp.getHttpServer())
      .post(`/cases/${caseId}/plans/${planId}/enqueue`)
      .set('Authorization', `Bearer ${process.env.API_AUTH_TOKEN}`)
      .send();
      
    if (enqueueResponse.status !== 201) {
      console.log('Enqueue Plan Failed:', enqueueResponse.body);
    }
    
    expect(enqueueResponse.status).toBe(201);

    // Trigger outbox processing manually since cron might not fire in test
    const { OutboxPublisherService } = await import('../../apps/api/src/modules/outbox-publisher/outbox-publisher.service.js');
    const outboxService = apiApp.get(OutboxPublisherService);
    await (outboxService as any).poll();

    // The background worker (started via WorkerModule) will automatically pick up the enqueued job from Redis
    // and process it asynchronously. We just need to wait for it.

    // 2. Wait for the Worker to process it asynchronously
    // We will poll the database for up to 10 seconds.
    let revCase = null;
    let attempts = 0;
    while (attempts < 20) {
      revCase = await prisma.revenueCase.findUnique({ where: { id: caseId } });
      console.log(`Polling state at attempt ${attempts}:`, revCase?.state);
      if (revCase?.state === RevenueCaseState.RECOVERED || revCase?.state === RevenueCaseState.ESCALATED || revCase?.state === RevenueCaseState.STOPPED || revCase?.state === RevenueCaseState.FAILED) {
        break;
      }
      await new Promise(r => setTimeout(r, 500));
      attempts++;
    }

    // 3. Assert Final State
    expect(revCase).toBeDefined();
    expect(revCase?.state).toBe(RevenueCaseState.RECOVERED); // The Mock Adapter should succeed!

    // 4. Verify Audit Trail
    const audits = await prisma.auditLog.findMany({
      where: { correlationId: revCase!.correlationId },
      orderBy: { timestamp: 'asc' }
    });

    const actions = audits.map(a => a.action);
    console.log('AUDIT ACTIONS:', actions);
    
    expect(actions).toContain('CASE_CREATED');
    expect(actions).toContain('PLAN_PROPOSED');
    expect(actions).toContain('INTERVENTION_PREPARED');
    expect(actions).toContain('INTERVENTION_SUCCESS');
  }, 30000); // 30s timeout for E2E
});
