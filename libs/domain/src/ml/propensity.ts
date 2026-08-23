import { RecoveryCase, RevenueEvent } from '@rr/contracts';

export interface PropensityScore {
  probabilityOfRecoveryWithRetry: number;
  probabilityOfRecoveryWithLink: number;
  recommendedIntervention: 'PAYMENT_RETRY' | 'PAYMENT_LINK';
  shadowFeatureVector: Record<string, number>;
}

/**
 * Shadow ML Propensity Pipeline
 * 
 * In a real environment, this would call a FastAPI microservice serving an XGBoost model,
 * or run an ONNX runtime directly. Here we simulate the pipeline to prove the boundary
 * and architectural capability. The returned scores should NOT override deterministic 
 * domain rules until holdout evaluation proves positive uplift (Phase 4).
 */
export function scorePropensity(revCase: RecoveryCase, event: RevenueEvent): PropensityScore {
  // Feature Engineering (Simulated)
  const timeSinceLastFailure = revCase.updatedAt.getTime() - revCase.createdAt.getTime();
  const amountBin = Number(revCase.amountAtRisk.amountMinor) > 1000000 ? 1 : 0; // > 10k INR
  const isCardError = event.failureReason.includes('insufficient_funds') ? 1 : 0;
  
  const featureVector = {
    timeSinceLastFailure,
    amountBin,
    isCardError,
    attemptCount: revCase.attemptCount,
  };

  // Mock Inference
  // If amount is large and it's not a card error, maybe payment link is better.
  let pRetry = 0.5;
  let pLink = 0.5;

  if (amountBin === 1) {
    pLink += 0.2;
    pRetry -= 0.1;
  }

  if (revCase.attemptCount > 2) {
    pLink += 0.2;
    pRetry -= 0.2;
  }

  return {
    probabilityOfRecoveryWithRetry: Math.max(0, Math.min(1, pRetry)),
    probabilityOfRecoveryWithLink: Math.max(0, Math.min(1, pLink)),
    recommendedIntervention: pLink > pRetry ? 'PAYMENT_LINK' : 'PAYMENT_RETRY',
    shadowFeatureVector: featureVector,
  };
}
