import { EvaluationCase } from '../dataset/schemas';
import { EvaluationStrategy, StrategyResult } from './strategy';
import { 
  qualifyRevenueEvent, 
  proposeRecoveryPlan,
} from '@rr/domain';
import { 
  MerchantConfig, 
  MerchantRecoveryPolicyConfig, 
  RecoveryCase, 
  RevenueCaseState,
  InterventionType,
  PaymentFailureReason,
  EventType,
  RevenueEvent,
  EventId,
  RevenueCaseId,
  MerchantId,
  CustomerId
} from '@rr/contracts';

/**
 * System Under Test (SUT) Strategy:
 * - Deterministic qualification + diagnosis + policy + planning + execution simulation.
 * - Simulates the real application paths as closely as possible.
 */
export class SystemUnderTestStrategy implements EvaluationStrategy {
  name = 'SystemUnderTest';

  async evaluate(evaluationCase: EvaluationCase): Promise<StrategyResult> {
    const gt = evaluationCase.groundTruth;
    
    let isRecovered = false;
    let interventionsAttempted = 0;
    let interventionsSucceeded = 0;
    let escalations = 0;
    let stops = 0;
    let policyBlocks = 0;
    let consentBlocks = 0;
    let providerTimeouts = 0;
    let providerRetries = 0;
    let providerFinalFailures = 0;
    let aiRequests = 0;
    let aiFallbacks = 0;

    // 1. Merchant Config Mock
    const merchantConfig: MerchantConfig = {
      minimumAmountMinor: 50n, // very low to not block
      supportedCurrencies: ['INR', 'USD'],
      eventMaxAgeHours: 720,
      supportedEventTypes: [EventType.PAYMENT_FAILED, EventType.SUBSCRIPTION_FAILED, EventType.INVOICE_OVERDUE],
      excludedMerchantSegments: []
    };

    const merchantPolicy: MerchantRecoveryPolicyConfig = {
      merchantId: 'merch_test' as MerchantId,
      policyVersion: '1',
      enabled: true,
      allowedInterventionTypes: [
        InterventionType.PAYMENT_RETRY, 
        InterventionType.EMAIL_REMINDER, 
        InterventionType.SMS_REMINDER,
        InterventionType.NO_ACTION,
        InterventionType.HUMAN_ESCALATION
      ],
      minimumRecoveryScore: 10,
      maxAttemptsPerCase: gt.maximumAttempts,
      maxRetryAmountMinor: 1000000n,
      manualApprovalAboveAmountMinor: 5000000n,
      staleEventLimitHours: 720,
      contactRules: {
        maxMessagesPerCustomerWindow: 2,
        messageWindowHours: 24,
        requiredConsentChannels: ['EMAIL_REMINDER', 'SMS_REMINDER']
      },
      featureFlags: {},
      updatedAt: new Date()
    };

    const amountMinor = BigInt(evaluationCase.sourceEvent.amountMinor);

    const sourceEvent: RevenueEvent = {
      eventId: evaluationCase.sourceEvent.eventId as EventId,
      merchantId: 'merch_test' as MerchantId,
      customerId: 'cust_test' as CustomerId,
      externalEventId: evaluationCase.sourceEvent.eventId as EventId,
      eventType: (evaluationCase.sourceEvent.eventType as string).toUpperCase().replace(/\./g, '_') as EventType,
      occurredAt: new Date(evaluationCase.eventTimestamp),
      amount: { amountMinor, currency: evaluationCase.sourceEvent.currency },
      failureReason: (evaluationCase.sourceEvent.failureReason as string || '').toUpperCase().replace(/^SCN_/, '') as PaymentFailureReason,
      correlationId: 'test' as any,
      rawPayloadVersion: '1.0',
      metadata: {
        customerConsents: JSON.stringify({
          email: evaluationCase.knownAllowedChannels.includes('email'),
          sms: evaluationCase.knownAllowedChannels.includes('sms'),
          voice: false
        })
      }
    };

    // 2. Qualify Event
    const qualification = qualifyRevenueEvent(sourceEvent, merchantConfig, 'standard');

    if (!qualification.eligible) {
      stops++;
      return this.buildResult(false, 0, 0, 0, 0, stops, 0, 0, 0, 0, 0, 0, 0, 0, '0');
    }

    // Mock Case
    const revCase: RecoveryCase = {
      caseId: 'case_test' as RevenueCaseId,
      merchantId: 'merch_test' as MerchantId,
      customerId: 'cust_test' as CustomerId,
      amountAtRisk: { amountMinor, currency: evaluationCase.sourceEvent.currency },
      state: RevenueCaseState.DETECTED,
      sourceEventId: evaluationCase.sourceEvent.eventId as EventId,
      createdAt: new Date(),
      updatedAt: new Date(),
      attemptCount: 0,
      version: 1,
      correlationId: 'test' as any
    };

    const activeSummary = { 
      activeCount: 0, 
      hasActivePaymentRetry: false,
      hasActivePaymentLink: false,
      hasActiveCommunication: false
    };

    // 4. Recovery Loop Simulation
    while (revCase.attemptCount < gt.maximumAttempts && revCase.state !== RevenueCaseState.RECOVERED && revCase.state !== RevenueCaseState.STOPPED && revCase.state !== RevenueCaseState.ESCALATED) {
      
      // Propose Plan
      const proposal = await proposeRecoveryPlan({
        revCase,
        sourceEvent,
        merchantPolicy,
        activeInterventionSummary: activeSummary,
        now: new Date()
      });
      aiRequests++;
      aiFallbacks++; // Deterministic planner acts as fallback

      const policyDecision = proposal.policyDecision;
      
      if (!policyDecision.approved) {
        if (policyDecision.reasonCodes.includes('CONSENT_MISSING' as any)) {
          consentBlocks++;
        } else {
          policyBlocks++;
        }
        
        if (policyDecision.stopCase) {
          stops++;
          revCase.state = RevenueCaseState.STOPPED;
          break; // Halts
        }
        if (policyDecision.escalationRequired) {
          escalations++;
          revCase.state = RevenueCaseState.ESCALATED;
          break; // Escalated
        }
        
        // Otherwise, it stops due to no other option
        stops++;
        revCase.state = RevenueCaseState.STOPPED;
        break;
      }

      const proposedAction = proposal.plan.interventionType;

      if (proposedAction === InterventionType.NO_ACTION) {
        stops++;
        revCase.state = RevenueCaseState.STOPPED;
        break;
      }

      if (proposedAction === InterventionType.HUMAN_ESCALATION || policyDecision.requiresHumanApproval) {
        escalations++;
        revCase.state = RevenueCaseState.ESCALATED;
        break;
      }

      // 5. Execute Action (Simulation of Adapter)
      interventionsAttempted++;
      revCase.attemptCount++;

      // Simulate provider outcome based on ground truth
      if (gt.providerScenario === 'success' || gt.providerScenario === 'payment_link_paid_after_event') {
        interventionsSucceeded++;
        isRecovered = true;
        revCase.state = RevenueCaseState.RECOVERED;
        break;
      } else if (gt.providerScenario === 'timeout_once_then_success') {
        if (revCase.attemptCount === 1) {
          providerTimeouts++;
          providerRetries++; // It failed, so we'll retry next loop
          revCase.state = RevenueCaseState.RETRYABLE;
          continue;
        } else {
          interventionsSucceeded++;
          isRecovered = true;
          revCase.state = RevenueCaseState.RECOVERED;
          break;
        }
      } else if (gt.providerScenario === 'permanent_failure') {
        providerFinalFailures++;
        revCase.state = RevenueCaseState.RETRYABLE;
        // Loop continues to next attempt if possible
      } else if (gt.providerScenario === 'no_customer_response') {
        revCase.state = RevenueCaseState.RETRYABLE;
        // Did not succeed, did not fail hard, just ignored.
      }
    }

    if (!isRecovered && revCase.attemptCount >= gt.maximumAttempts && revCase.state !== RevenueCaseState.ESCALATED && revCase.state !== RevenueCaseState.STOPPED) {
      escalations++; // Exhausted
    }

    return this.buildResult(
      isRecovered,
      interventionsAttempted,
      interventionsSucceeded,
      policyBlocks,
      escalations,
      stops,
      consentBlocks,
      0, // idempotentReplays
      providerTimeouts,
      providerRetries,
      providerFinalFailures,
      0, // workflowFailures
      aiRequests,
      aiFallbacks,
      isRecovered ? evaluationCase.sourceEvent.amountMinor : '0'
    );
  }

  private buildResult(
    isRecovered: boolean,
    interventionsAttempted: number,
    interventionsSucceeded: number,
    policyBlocks: number,
    escalations: number,
    stops: number,
    consentBlocks: number,
    idempotentReplays: number,
    providerTimeouts: number,
    providerRetries: number,
    providerFinalFailures: number,
    workflowFailures: number,
    aiRequests: number,
    aiFallbacks: number,
    recoveredAmountMinor: string
  ): StrategyResult {
    return {
      interventionsAttempted,
      interventionsSucceeded,
      falseInterventionCount: 0, // No false interventions in deterministic sim
      recoveredAmountMinor,
      isRecovered,
      policyBlocks,
      escalations,
      stops,
      unsafeActionsPrevented: 0,
      staleActionsPrevented: 0,
      consentBlocks,
      idempotentReplays,
      providerTimeouts,
      providerRetries,
      providerFinalFailures,
      workflowFailures,
      aiRequests,
      aiFallbacks
    };
  }
}
