import { RecoveryCase, RevenueEvent } from '@rr/contracts';

/**
 * Propensity scores from the offline causal benchmark model.
 *
 * PROVENANCE: Trained on public Hillstrom MineThatData RCT (email marketing).
 * NOT trained on Razorpay production data. Scores are advisory only and do NOT
 * represent actual Razorpay payment recovery probabilities.
 */
export interface PropensityScore {
  /** Incremental uplift probability from the offline benchmark model (NOT a Razorpay recovery probability) */
  probabilityOfRecoveryWithRetry: number;
  /** Incremental uplift probability from the offline benchmark model (NOT a Razorpay recovery probability) */
  probabilityOfRecoveryWithLink: number;
  recommendedIntervention: 'PAYMENT_RETRY' | 'PAYMENT_LINK';
  shadowFeatureVector: Record<string, number>;
}

/**
 * Shadow ML Propensity Pipeline — Offline Benchmark Model
 *
 * Model provenance: XGBoost T-Learner trained on public Hillstrom RCT.
 * NOT trained on Razorpay production data.
 *
 * Scores are logged for audit but do NOT override deterministic domain rules.
 * In production, this would call a FastAPI microservice serving a model trained
 * on Razorpay's own payment-recovery RCT data.
 */
export async function scorePropensity(revCase: RecoveryCase, event: RevenueEvent): Promise<PropensityScore> {
  // Feature Engineering for Hillstrom
  const timeSinceLastFailure = revCase.updatedAt.getTime() - revCase.createdAt.getTime();
  const amountBin = Number(revCase.amountAtRisk.amountMinor) > 1000000 ? 1 : 0; // > 10k INR
  const isCardError = event.failureReason?.includes('insufficient_funds') ? 1 : 0;
  
  // Construct the payload matching the Domain-Specific ML feature schema
  const mlPayload = {
    daysSinceLastPayment: Math.max(1, Math.floor(timeSinceLastFailure / (1000 * 60 * 60 * 24 * 30))), // approximate months
    amountMinor: Number(revCase.amountAtRisk.amountMinor) / 100, // INR
    isCardError: isCardError,
    isHighValueMerchant: amountBin,
    isFirstAttempt: revCase.attemptCount === 0 ? 1 : 0,
    amountSegment: amountBin ? "7) $1,000 +" : "2) $100 - $200",
    customerLocation: "Urban",
    paymentChannel: "Web"
  };

  try {
    // Attempt to call the Python ML microservice
    const response = await fetch('http://localhost:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mlPayload),
    });

    if (response.ok) {
      const result = await response.json();
      return {
        probabilityOfRecoveryWithRetry: result.treatments[0].incremental_probability_uplift,
        probabilityOfRecoveryWithLink: result.treatments[1].incremental_probability_uplift,
        recommendedIntervention: result.best_treatment === "INTERVENTION_A" ? 'PAYMENT_RETRY' : 'PAYMENT_LINK',
        shadowFeatureVector: mlPayload as any,
      };
    }
  } catch (error) {
    console.warn("ML Service unavailable, falling back to mock propensity scoring");
  }

  // Mock Inference Fallback
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
    shadowFeatureVector: mlPayload as any,
  };
}
