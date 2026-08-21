import { EvaluationCase } from '../dataset/schemas.js';
import { EvaluationStrategy, StrategyResult } from './strategy.js';

/**
 * Baseline 1 — Naive Retry/Reminder:
 * - For every eligible case: one generic action based only on event type
 * - no policy-aware personalization
 * - no root-cause diagnosis
 * - no multi-step recovery logic
 * - Must still obey basic safety constraints.
 */
export class Baseline1Strategy implements EvaluationStrategy {
  name = 'Baseline1';

  async evaluate(evaluationCase: EvaluationCase): Promise<StrategyResult> {
    const gt = evaluationCase.groundTruth;
    const allowed = evaluationCase.knownAllowedChannels;

    let interventionsAttempted = 0;
    let interventionsSucceeded = 0;
    let falseInterventionCount = 0;
    let isRecovered = false;
    let providerTimeouts = 0;
    let providerRetries = 0;
    let providerFinalFailures = 0;

    // Naive rule: just pick the first allowed channel and try once.
    if (allowed.length > 0) {
      const channel = allowed[0];
      interventionsAttempted++;

      if (!gt.recoverable) {
        falseInterventionCount++;
        providerFinalFailures++;
      } else {
        // Simulate against provider scenario
        switch (gt.providerScenario) {
          case 'success':
          case 'payment_link_paid_after_event':
            interventionsSucceeded++;
            isRecovered = true;
            break;
          case 'timeout_once_then_success':
            providerTimeouts++;
            // Baseline 1 is naive, it might not retry intelligently, but let's say it does one basic retry
            interventionsAttempted++;
            providerRetries++;
            interventionsSucceeded++;
            isRecovered = true;
            break;
          case 'permanent_failure':
          case 'invalid_response':
            providerFinalFailures++;
            break;
          case 'no_customer_response':
            // Sent, but no recovery
            interventionsSucceeded++; 
            break;
        }
      }
    }

    return {
      interventionsAttempted,
      interventionsSucceeded,
      falseInterventionCount,
      recoveredAmountMinor: isRecovered ? evaluationCase.sourceEvent.amountMinor : '0',
      isRecovered,
      policyBlocks: 0,
      escalations: 0,
      stops: 0,
      unsafeActionsPrevented: 0, // Baseline 1 doesn't have advanced safety
      staleActionsPrevented: 0,
      consentBlocks: 0,
      idempotentReplays: 0,
      providerTimeouts,
      providerRetries,
      providerFinalFailures,
      workflowFailures: 0,
      aiRequests: 0,
      aiFallbacks: 0
    };
  }
}
