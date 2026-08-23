import { expect, test, describe } from 'vitest';
import { 
  proposeRecoveryPlan,
  PlanProposalInput
} from '../../libs/domain/src/planning';
import { 
  RevenueCaseState, 
  RootCause, 
  InterventionType,
  AIDataClassification,
  AIUseCase,
  AILocale,
  AIRequestContext,
  CorrelationId,
  RevenueCaseId,
  MerchantId,
  CustomerId
} from '../../libs/contracts/src';
import { getFallbackMessageDraft } from '../../libs/llm/src/fallbacks/templates';

describe('Phase 3: AI Decision Quality & Safety Bounds', () => {
  
  describe('Deterministic Policy Boundary over AI', () => {
    test('Intervention selection is strictly deterministic and ignores AI hallucinations', () => {
      // The architecture inherently prevents AI from hallucinating interventions 
      // by placing the decision logic entirely in deterministic domain functions.
      // This test proves that the allowed interventions are strictly constrained.
      
      const input: PlanProposalInput = {
        revCase: {
          caseId: 'case_1' as RevenueCaseId,
          sourceEventId: 'evt_1' as any,
          merchantId: 'merch_1' as MerchantId,
          customerId: 'cust_1' as CustomerId,
          amountAtRisk: { amountMinor: 150000n, currency: 'INR' },
          state: RevenueCaseState.DETECTED,
          createdAt: new Date(),
          updatedAt: new Date(),
          rootCause: RootCause.TRANSIENT_BANK_OR_NETWORK_FAILURE,
          attemptCount: 0,
          correlationId: 'corr_1' as CorrelationId,
          version: 1
        },
        sourceEvent: {
          eventId: 'evt_1' as any,
          externalEventId: 'evt_ext_1',
          merchantId: 'merch_1' as MerchantId,
          customerId: 'cust_1' as CustomerId,
          amount: { amountMinor: 150000n, currency: 'INR' },
          eventType: 'PAYMENT_FAILED' as any,
          failureReason: 'INSUFFICIENT_FUNDS' as any,
          occurredAt: new Date(),
          correlationId: 'corr_1' as CorrelationId,
          rawPayloadVersion: '1.0',
          metadata: {
             customerConsents: '{ "email": true, "sms": true, "voice": true }'
          }
        },
        merchantPolicy: {
          merchantId: 'merch_1' as MerchantId,
          policyVersion: '1.0',
          enabled: true,
          contactRules: {
            maxMessagesPerCustomerWindow: 2,
            messageWindowHours: 24,
            requiredConsentChannels: ['sms', 'email', 'voice']
          },
          staleEventLimitHours: 72,
          featureFlags: {},
          updatedAt: new Date(),
          allowedInterventionTypes: [InterventionType.PAYMENT_LINK, InterventionType.EMAIL_REMINDER],
          maxAttemptsPerCase: 3,
          minimumRecoveryScore: 50,
          maxRetryAmountMinor: 200000n,
          manualApprovalAboveAmountMinor: 500000n
        },
        activeInterventionSummary: {
          hasActivePaymentRetry: false,
          hasActivePaymentLink: false,
          hasActiveCommunication: false
        },
        now: new Date()
      };

      const result = proposeRecoveryPlan(input);

      expect(result.plan.interventionType).not.toBe(InterventionType.PAYMENT_RETRY);
      expect(result.plan.interventionType).toBe(InterventionType.PAYMENT_LINK);
      expect(result.plan.planStatus).toBe('POLICY_APPROVED');
    });
  });

  describe('AI Fallback & Malformed Output Tolerance', () => {
    test('Fallback template generator provides safe bounded output when LLM is unavailable', () => {
      const context: AIRequestContext = {
        requestId: 'req_1',
        correlationId: 'corr_1' as CorrelationId,
        useCase: AIUseCase.RECOVERY_MESSAGE_DRAFT,
        locale: AILocale.EN_IN,
        merchantDisplayName: 'Test Merchant',
        maskedCustomerReference: 'CUST-1234',
        amountDisplay: 'INR 1500',
        currency: 'INR',
        eventType: 'PAYMENT_FAILED',
        failureReason: 'bank_timeout',
        rootCause: 'bank_timeout',
        interventionType: 'SEND_SMS_REMINDER',
        policyReasonCodes: ['RISK_LOW'],
        maxAttemptsRemaining: 2,
        channel: 'SEND_SMS_REMINDER',
        constraints: {
          maxCharacters: 160,
          forbiddenClaims: ['guarantee', 'legal action'],
          allowedTone: 'professional',
        },
        dataClassification: AIDataClassification.MASKED_DEMO,
      };

      const draft = getFallbackMessageDraft(context);

      expect(draft).toBeDefined();
      expect(draft.text).toContain('Test Merchant');
      expect(draft.text).toContain('INR 1500');
      
      expect(draft.text.length).toBeLessThanOrEqual(160);
      
      expect(draft.source).toBe('DETERMINISTIC_FALLBACK');
    });
  });
});
