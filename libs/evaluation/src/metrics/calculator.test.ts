import { describe, it, expect } from 'vitest';
import { MetricsCalculator } from './calculator';
import { EvaluationCase } from '../dataset/schemas';
import { StrategyResult } from '../baselines/strategy';

describe('MetricsCalculator', () => {
  it('computes correct financial totals', () => {
    const cases: EvaluationCase[] = [
      {
        scenarioId: 'S1',
        sourceEvent: { eventId: 'E1', eventType: 'payment_failed', amountMinor: '100', currency: 'INR', failureReason: 'F', metadata: {} },
        merchantPolicyReference: 'P1',
        maskedCustomerReference: 'C1',
        knownAllowedChannels: [],
        eventTimestamp: new Date().toISOString(),
        groundTruth: { recoverable: true, successfulInterventions: [], unsuccessfulInterventions: [], expectedRecoveryAmountMinor: '100', minimumAttempts: 1, maximumAttempts: 3, providerScenario: 'success', unsafeConditions: [], expectedEscalation: false, expectedStop: false }
      },
      {
        scenarioId: 'S2',
        sourceEvent: { eventId: 'E2', eventType: 'payment_failed', amountMinor: '250', currency: 'INR', failureReason: 'F', metadata: {} },
        merchantPolicyReference: 'P1',
        maskedCustomerReference: 'C1',
        knownAllowedChannels: [],
        eventTimestamp: new Date().toISOString(),
        groundTruth: { recoverable: true, successfulInterventions: [], unsuccessfulInterventions: [], expectedRecoveryAmountMinor: '250', minimumAttempts: 1, maximumAttempts: 3, providerScenario: 'success', unsafeConditions: [], expectedEscalation: false, expectedStop: false }
      }
    ];

    const sutResults: StrategyResult[] = [
      {
        interventionsAttempted: 1, interventionsSucceeded: 1, falseInterventionCount: 0,
        recoveredAmountMinor: '100', isRecovered: true, policyBlocks: 0, escalations: 0, stops: 0,
        unsafeActionsPrevented: 0, staleActionsPrevented: 0, consentBlocks: 0, idempotentReplays: 0,
        providerTimeouts: 0, providerRetries: 0, providerFinalFailures: 0, workflowFailures: 0, aiRequests: 1, aiFallbacks: 0
      },
      {
        interventionsAttempted: 2, interventionsSucceeded: 0, falseInterventionCount: 1,
        recoveredAmountMinor: '0', isRecovered: false, policyBlocks: 1, escalations: 1, stops: 0,
        unsafeActionsPrevented: 0, staleActionsPrevented: 0, consentBlocks: 0, idempotentReplays: 0,
        providerTimeouts: 0, providerRetries: 0, providerFinalFailures: 0, workflowFailures: 0, aiRequests: 2, aiFallbacks: 0
      }
    ];

    const b0Results: StrategyResult[] = [
      {
        interventionsAttempted: 0, interventionsSucceeded: 0, falseInterventionCount: 0,
        recoveredAmountMinor: '0', isRecovered: false, policyBlocks: 0, escalations: 0, stops: 0,
        unsafeActionsPrevented: 0, staleActionsPrevented: 0, consentBlocks: 0, idempotentReplays: 0,
        providerTimeouts: 0, providerRetries: 0, providerFinalFailures: 0, workflowFailures: 0, aiRequests: 0, aiFallbacks: 0
      },
      {
        interventionsAttempted: 0, interventionsSucceeded: 0, falseInterventionCount: 0,
        recoveredAmountMinor: '0', isRecovered: false, policyBlocks: 0, escalations: 0, stops: 0,
        unsafeActionsPrevented: 0, staleActionsPrevented: 0, consentBlocks: 0, idempotentReplays: 0,
        providerTimeouts: 0, providerRetries: 0, providerFinalFailures: 0, workflowFailures: 0, aiRequests: 0, aiFallbacks: 0
      }
    ];

    const metrics = MetricsCalculator.compute(cases, b0Results, b0Results, sutResults, 150);

    expect(metrics.totalAtRiskMinor).toBe('350');
    expect(metrics.systemRecoveredMinor).toBe('100');
    expect(metrics.recoveryRate).toBeCloseTo(100 / 350, 4);
    expect(metrics.interventionsAttempted).toBe(3);
    expect(metrics.interventionsSucceeded).toBe(1);
    expect(metrics.interventionPrecision).toBeCloseTo(1 / 3, 4);
    expect(metrics.failedInterventions).toBe(2);
    expect(metrics.failedInterventionRate).toBeCloseTo(2 / 3, 4);
    expect(metrics.falseInterventionCount).toBe(1);
    expect(metrics.averageAttemptsPerCase).toBe(1.5);
    expect(metrics.evaluationRuntimeMs).toBe(150);
  });
});
