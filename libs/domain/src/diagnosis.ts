import {
  RecoveryCase,
  RevenueEvent,
  MerchantRecoveryPolicyConfig,
  RootCause,
  RecoveryReasonCode,
  DiagnosisResult,
  InterventionType,
} from '@rr/contracts';

// Note: the rules for root cause:
// PAYMENT_FAILED + BANK_TIMEOUT / NETWORK_ERROR → TRANSIENT_BANK_OR_NETWORK_FAILURE.
// PAYMENT_FAILED + INSUFFICIENT_FUNDS → INSUFFICIENT_FUNDS_LIKELY.
// PAYMENT_FAILED + AUTHENTICATION_REQUIRED → AUTHENTICATION_OR_CUSTOMER_ACTION_REQUIRED.
// SUBSCRIPTION_FAILED + MANDATE_FAILED → MANDATE_OR_SUBSCRIPTION_ISSUE.
// CHECKOUT_ABANDONED → CHECKOUT_DROP_OFF.
// INVOICE_OVERDUE → INVOICE_COLLECTION_DELAY.
// Anything unknown → UNKNOWN.

export function diagnoseRevenueCase(
  revCase: RecoveryCase,
  sourceEvent: RevenueEvent,
  merchantPolicy: MerchantRecoveryPolicyConfig,
  now: Date
): DiagnosisResult {
  const eventType = sourceEvent.eventType.toUpperCase();
  const failureReason = sourceEvent.failureReason?.toUpperCase() || '';

  let rootCause = RootCause.UNKNOWN;
  let confidence = 0.4;
  const reasonCodes: RecoveryReasonCode[] = [];

  if (eventType === 'PAYMENT_FAILED') {
    if (failureReason === 'BANK_TIMEOUT' || failureReason === 'NETWORK_ERROR') {
      rootCause = RootCause.TRANSIENT_BANK_OR_NETWORK_FAILURE;
      confidence = 0.95;
      reasonCodes.push(RecoveryReasonCode.FAILURE_REASON_TRANSIENT);
    } else if (failureReason === 'INSUFFICIENT_FUNDS') {
      rootCause = RootCause.INSUFFICIENT_FUNDS_LIKELY;
      confidence = 0.95;
      reasonCodes.push(RecoveryReasonCode.FAILURE_REASON_INSUFFICIENT_FUNDS);
    } else if (failureReason === 'AUTHENTICATION_REQUIRED') {
      rootCause = RootCause.AUTHENTICATION_OR_CUSTOMER_ACTION_REQUIRED;
      confidence = 0.95;
      reasonCodes.push(RecoveryReasonCode.FAILURE_REASON_AUTH_REQUIRED);
    } else {
      confidence = 0.75;
    }
  } else if (eventType === 'SUBSCRIPTION_FAILED') {
    if (failureReason === 'MANDATE_FAILED') {
      rootCause = RootCause.MANDATE_OR_SUBSCRIPTION_ISSUE;
      confidence = 0.95;
      reasonCodes.push(RecoveryReasonCode.FAILURE_REASON_MANDATE);
    } else {
      rootCause = RootCause.MANDATE_OR_SUBSCRIPTION_ISSUE;
      confidence = 0.75;
    }
  } else if (eventType === 'CHECKOUT_ABANDONED') {
    rootCause = RootCause.CHECKOUT_DROP_OFF;
    confidence = 0.95;
    reasonCodes.push(RecoveryReasonCode.CHECKOUT_ABANDONED);
  } else if (eventType === 'INVOICE_OVERDUE') {
    rootCause = RootCause.INVOICE_COLLECTION_DELAY;
    confidence = 0.95;
    reasonCodes.push(RecoveryReasonCode.INVOICE_OVERDUE);
  }

  const ageInMs = now.getTime() - sourceEvent.occurredAt.getTime();
  const ageInHours = ageInMs / (1000 * 60 * 60);

  if (ageInHours > merchantPolicy.staleEventLimitHours) {
    reasonCodes.push(RecoveryReasonCode.EVENT_TOO_STALE);
  }

  return {
    rootCause,
    confidence,
    reasonCodes,
    candidateInterventions: [],
    recommendedIntervention: InterventionType.NO_ACTION,
    requiresHumanReview: false,
    evaluatedAt: now,
  };
}
