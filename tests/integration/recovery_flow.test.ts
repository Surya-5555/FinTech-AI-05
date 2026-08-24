
import { expect, test, describe, beforeAll } from 'vitest';
import { randomUUID } from 'crypto';
import { 
  getPrismaClient, 
  PrismaIngestionRepository, 
  PrismaExecutionRepository,
  PrismaRevenueCaseRepository
} from '../../libs/persistence/src';
import { IngestionCommand } from '../../libs/persistence/src';
import { qualifyRevenueEvent, proposeRecoveryPlan } from '../../libs/domain/src';
import { RevenueCaseState } from '../../libs/contracts/src';

describe('Fintech Safety: Recovery Flow Guarantees', () => {
  const prisma = getPrismaClient();
  const ingestionRepo = new PrismaIngestionRepository();
  const executionRepo = new PrismaExecutionRepository();
  const caseRepo = new PrismaRevenueCaseRepository();

  const merchantRef = `merch_test_${randomUUID()}`;
  const customerRef = `cust_test_${randomUUID()}`;

  beforeAll(async () => {
    await prisma.merchant.create({
      data: {
        id: `m_${randomUUID()}`,
        externalReference: merchantRef,
        name: 'Test Merchant',
        segment: 'test',
        status: 'ACTIVE',
        configJson: '{}'
      }
    });
    await prisma.customer.create({
      data: {
        id: `c_${randomUUID()}`,
        merchantId: merchantRef, 
        externalReference: customerRef,
        displayNameOrMaskedReference: 'mask_1234',
        consentEmail: 'true',
        consentSms: 'true',
        consentVoice: 'false',
        contactWindowMetadataJson: '{}'
      }
    });
  });
  
  const setupCase = async () => {
    const externalEventId = `evt_test_${randomUUID()}`;
    const command: IngestionCommand = {
      event: {
        externalEventId,
        eventType: 'PAYMENT_FAILED' as any,
        occurredAt: new Date(),
        amount: { amountMinor: 1000n, currency: 'INR' },
        failureReason: 'insufficient_funds' as any,
        correlationId: `corr_${randomUUID()}` as any,
        rawPayloadVersion: '1.0',
        metadata: {}
      } as any,
      idempotencyKey: `idemp_${randomUUID()}`,
      merchantReference: merchantRef,
      customerReference: customerRef,
      customerMaskedReference: 'mask_1234',
      customerConsents: { email: true as any, sms: true as any, voice: false as any }
    };
    const result = await ingestionRepo.ingestEventAndCreateCaseIfEligible(command, qualifyRevenueEvent);
    return result.revenueCase!;
  };

  test('Duplicate intervention execution is safely blocked', async () => {
    const revCase = await setupCase();
    const planId = `plan_${randomUUID()}`;
    const idempotencyKey = `idemp_int_${randomUUID()}`;

    // 1. Prepare intervention (Worker A)
    const int1 = await executionRepo.prepareInterventionForExecution({
      planId,
      caseId: revCase.caseId,
      merchantId: revCase.merchantId,
      interventionType: 'PAYMENT_RETRY' as any,
      idempotencyKey,
      attemptCount: 1
    });

    // 2. Prepare again (Worker B) - Should return same intervention
    const int2 = await executionRepo.prepareInterventionForExecution({
      planId,
      caseId: revCase.caseId,
      merchantId: revCase.merchantId,
      interventionType: 'PAYMENT_RETRY' as any,
      idempotencyKey,
      attemptCount: 1
    });

    expect(int1.id).toBe(int2.id);

    // 3. Claim Lock (Worker A)
    const lock1 = await executionRepo.claimExecutionLock(int1.id, 'worker-A');
    expect(lock1).toBe(true);

    // 4. Claim Lock (Worker B) - Should fail to acquire
    const lock2 = await executionRepo.claimExecutionLock(int1.id, 'worker-B');
    expect(lock2).toBe(false);

    const intFromDb = await prisma.intervention.findUnique({ where: { id: int1.id }});
    expect(intFromDb?.lockedBy).toBe('worker-A');
  });

  test('Stale-state / optimistic concurrency blocks conflicting transitions', async () => {
    const revCase = await setupCase();
    
    // Simulate updating the version externally (e.g. another process successfully transitioned it)
    await prisma.revenueCase.update({
      where: { id: revCase.caseId },
      data: { version: revCase.version + 1, state: RevenueCaseState.EXECUTING }
    });

    // Try to transition using the old version
    await expect(
      caseRepo.transitionWithVersion(revCase, RevenueCaseState.RECOVERED, revCase.version + 1)
    ).rejects.toThrow('Version mismatch or case not found');
  });

  test('Stopping rule: Exceed max attempts stops the workflow', async () => {
    const revCase = await setupCase();
    
    // Create a scenario where max attempts is 2, and we have already tried 2 times
    const proposal = await proposeRecoveryPlan({
      revCase: {
        ...revCase,
        state: RevenueCaseState.RETRYABLE,
        attemptCount: 2 // already tried 2 times
      },
      sourceEvent: {
        eventType: 'PAYMENT_FAILED',
        failureReason: 'INSUFFICIENT_FUNDS',
        occurredAt: new Date(),
        metadata: {
          customerConsents: { email: true, sms: true, voice: false }
        }
      } as any,
      merchantPolicy: {
        enabled: true,
        merchantId: merchantRef,
        maxAttemptsPerCase: 2,
        allowedChannels: ['EMAIL', 'SMS', 'VOICE'],
        allowedInterventionTypes: ['EMAIL_REMINDER', 'SMS_REMINDER', 'PAYMENT_RETRY', 'NO_ACTION'],
        minAmountMinor: 100n,
        maxAmountMinor: 10000000n,
        retryDelays: [3600],
        escalateToHumanOnExhaustion: false,
        version: '1'
      } as any,
      activeInterventionSummary: {} as any,
      now: new Date()
    });

    expect(proposal.resultingCaseState).toBe('STOPPED');
    expect(proposal.plan.planStatus).toBe('POLICY_REJECTED');
  });

  test('Policy-blocked action: Reject if consent is missing', async () => {
    const revCase = await setupCase();
    
    // Create a scenario where no consent is provided
    const proposal = await proposeRecoveryPlan({
      revCase: {
        ...revCase,
        state: RevenueCaseState.DETECTED,
        attemptCount: 0
      },
      sourceEvent: {
        eventType: 'PAYMENT_FAILED',
        failureReason: 'INSUFFICIENT_FUNDS',
        occurredAt: new Date(),
        metadata: {
          customerConsents: { email: false, sms: false, voice: false } // Blocked!
        }
      } as any,
      merchantPolicy: {
        enabled: true,
        merchantId: merchantRef,
        maxAttemptsPerCase: 3,
        allowedChannels: ['EMAIL', 'SMS'],
        allowedInterventionTypes: ['EMAIL_REMINDER', 'SMS_REMINDER', 'PAYMENT_RETRY', 'NO_ACTION'],
        minAmountMinor: 100n,
        maxAmountMinor: 100000n,
        retryDelays: [3600],
        escalateToHumanOnExhaustion: false,
        version: '1'
      } as any,
      activeInterventionSummary: {} as any,
      now: new Date()
    });

    expect(proposal.plan.planStatus).toBe('POLICY_REJECTED');
    const reasons = proposal.plan.reasonCodes;
    expect(reasons).toContain('CONSENT_MISSING');
  });
});
