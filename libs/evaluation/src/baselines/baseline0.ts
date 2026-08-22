import { EvaluationCase } from '../dataset/schemas';
import { EvaluationStrategy, StrategyResult } from './strategy';

/**
 * Baseline 0 — No Recovery:
 * - Ingest only.
 * - No recovery plan, no notification, no payment link, no retry.
 * - Recovered amount = only naturally recovered cases if that behavior exists in ground truth.
 */
export class Baseline0Strategy implements EvaluationStrategy {
  name = 'Baseline0';

  async evaluate(evaluationCase: EvaluationCase): Promise<StrategyResult> {
    // If a case naturally recovers without intervention, we simulate it here.
    // For now, our ground truth doesn't explicitly have "naturally recovered" without ANY intervention,
    // but if it did, we'd check it here. Let's assume baseline 0 recovers nothing.
    const isNaturallyRecovered = false; 

    return {
      interventionsAttempted: 0,
      interventionsSucceeded: 0,
      falseInterventionCount: 0,
      recoveredAmountMinor: isNaturallyRecovered ? evaluationCase.sourceEvent.amountMinor : '0',
      isRecovered: isNaturallyRecovered,
      policyBlocks: 0,
      escalations: 0,
      stops: 0,
      unsafeActionsPrevented: 0,
      staleActionsPrevented: 0,
      consentBlocks: 0,
      idempotentReplays: 0,
      providerTimeouts: 0,
      providerRetries: 0,
      providerFinalFailures: 0,
      workflowFailures: 0,
      aiRequests: 0,
      aiFallbacks: 0
    };
  }
}
