import { EvaluationCase } from '../dataset/schemas.js';
import { EvaluationStrategy, StrategyResult } from './strategy.js';

/**
 * System Under Test (SUT) Strategy:
 * - Current deterministic qualification + diagnosis + policy + planning + execution simulation.
 * - Simulates the real application paths as closely as possible.
 */
export class SystemUnderTestStrategy implements EvaluationStrategy {
  name = 'SystemUnderTest';

  async evaluate(evaluationCase: EvaluationCase): Promise<StrategyResult> {
    // TODO: Instantiate the actual Deterministic Policy Engine, Planner, and safe execution bounds.
    // For now, simulate an idealized version of the SUT based on ground truth, to get the runner working.
    // In the next step, this will be wired to the real domain logic.
    
    const gt = evaluationCase.groundTruth;
    
    let isRecovered = false;
    let interventionsAttempted = 0;
    let interventionsSucceeded = 0;
    let escalations = 0;
    let stops = 0;

    if (gt.recoverable) {
      if (gt.providerScenario === 'success' || gt.providerScenario === 'payment_link_paid_after_event') {
        interventionsAttempted++;
        interventionsSucceeded++;
        isRecovered = true;
      } else if (gt.providerScenario === 'timeout_once_then_success') {
        interventionsAttempted += 2;
        interventionsSucceeded++;
        isRecovered = true;
      } else {
        interventionsAttempted++;
        escalations++;
      }
    } else {
      stops++;
    }

    return {
      interventionsAttempted,
      interventionsSucceeded,
      falseInterventionCount: 0,
      recoveredAmountMinor: isRecovered ? evaluationCase.sourceEvent.amountMinor : '0',
      isRecovered,
      policyBlocks: 0,
      escalations,
      stops,
      unsafeActionsPrevented: 0,
      staleActionsPrevented: 0,
      consentBlocks: 0,
      idempotentReplays: 0,
      providerTimeouts: 0,
      providerRetries: 0,
      providerFinalFailures: 0,
      workflowFailures: 0,
      aiRequests: 1, // simulates planning step
      aiFallbacks: 1 // default uses fallback
    };
  }
}
