import { describe, it, expect } from 'vitest';
import {
  diagnoseRevenueCase,
  selectCandidateInterventions,
  recommendIntervention,
  evaluateRecoveryPolicy,
  proposeRecoveryPlan,
} from '../src/index.js';
import {
  RecoveryCase,
  RevenueEvent,
  MerchantRecoveryPolicyConfig,
  RootCause,
  RecoveryReasonCode,
  InterventionType,
  RevenueCaseState,
  RecoveryPlanStatus,
} from '@rr/contracts';

const mockMerchantPolicy: MerchantRecoveryPolicyConfig = {
  merchantId: 'm1',
  policyVersion: 'v1',
  enabled: true,
  allowedInterventionTypes: [
    InterventionType.PAYMENT_RETRY,
    InterventionType.PAYMENT_LINK,
    InterventionType.SMS_REMINDER,
    InterventionType.EMAIL_REMINDER,
    InterventionType.HUMAN_ESCALATION,
    InterventionType.NO_ACTION,
  ],
  maxAttemptsPerCase: 3,
  maxRetryAmountMinor: 1000000n, // 10k
  minimumRecoveryScore: 50,
  manualApprovalAboveAmountMinor: 5000000n, // 50k
  staleEventLimitHours: 24,
  contactRules: {
    messageWindowHours: 24,
    maxMessagesPerCustomerWindow: 1,
    requiredConsentChannels: [],
  },
  featureFlags: {},
  updatedAt: new Date(),
};

const mockEvent = (eventType: string, failureReason?: string): RevenueEvent => ({
  id: 'e1',
  externalEventId: 'ex1',
  merchantId: 'm1',
  eventType,
  amountMinor: 50000n,
  currency: 'INR',
  occurredAt: new Date(),
  receivedAt: new Date(),
  correlationId: 'c1',
  rawPayloadVersion: '1',
  metadata: {},
  ingestionIdempotencyKey: 'i1',
  failureReason,
});

const mockCase = (): RecoveryCase => ({
  caseId: 'c1' as any,
  sourceEventId: 'e1' as any,
  merchantId: 'm1' as any,
  customerId: 'cus1' as any,
  amountAtRisk: { amountMinor: 50000n, currency: 'INR' },
  state: RevenueCaseState.DETECTED,
  attemptCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  correlationId: 'c1' as any,
});

describe('Recovery Planning Domain Logic', () => {
  it('diagnoses TRANSIENT_BANK_OR_NETWORK_FAILURE', () => {
    const rc = mockCase();
    const ev = mockEvent('PAYMENT_FAILED', 'NETWORK_ERROR');
    const result = diagnoseRevenueCase(rc, ev, mockMerchantPolicy, new Date());
    expect(result.rootCause).toBe(RootCause.TRANSIENT_BANK_OR_NETWORK_FAILURE);
    expect(result.confidence).toBe(0.95);
  });

  it('selects candidates based on diagnosis', () => {
    const rc = mockCase();
    const ev = mockEvent('PAYMENT_FAILED', 'NETWORK_ERROR');
    const diag = diagnoseRevenueCase(rc, ev, mockMerchantPolicy, new Date());
    const candidates = selectCandidateInterventions(rc, diag, mockMerchantPolicy);
    expect(candidates).toContain(InterventionType.PAYMENT_RETRY);
  });

  it('proposes plan end-to-end for valid case', () => {
    const rc = mockCase();
    const ev = mockEvent('PAYMENT_FAILED', 'NETWORK_ERROR');
    const proposal = proposeRecoveryPlan({
      revCase: rc,
      sourceEvent: ev,
      merchantPolicy: mockMerchantPolicy,
      activeInterventionSummary: {
        hasActiveCommunication: false,
        hasActivePaymentLink: false,
        hasActivePaymentRetry: false,
      },
      now: new Date(),
    });

    expect(proposal.resultingCaseState).toBe(RevenueCaseState.POLICY_CHECKED);
    expect(proposal.plan.planStatus).toBe(RecoveryPlanStatus.POLICY_APPROVED);
    expect(proposal.plan.interventionType).toBe(InterventionType.PAYMENT_RETRY);
    expect(proposal.diagnosis.rootCause).toBe(RootCause.TRANSIENT_BANK_OR_NETWORK_FAILURE);
  });
});
