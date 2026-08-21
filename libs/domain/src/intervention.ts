import {
  RecoveryCase,
  MerchantRecoveryPolicyConfig,
  RootCause,
  InterventionType,
  DiagnosisResult,
} from '@rr/contracts';

export function selectCandidateInterventions(
  revCase: RecoveryCase,
  diagnosis: DiagnosisResult,
  merchantPolicy: MerchantRecoveryPolicyConfig
): InterventionType[] {
  let candidates: InterventionType[] = [];

  switch (diagnosis.rootCause) {
    case RootCause.TRANSIENT_BANK_OR_NETWORK_FAILURE:
      candidates = [
        InterventionType.PAYMENT_RETRY,
        InterventionType.PAYMENT_LINK,
        InterventionType.HUMAN_ESCALATION,
      ];
      break;
    case RootCause.INSUFFICIENT_FUNDS_LIKELY:
      candidates = [
        InterventionType.PAYMENT_LINK,
        InterventionType.SMS_REMINDER,
        InterventionType.EMAIL_REMINDER,
        InterventionType.HUMAN_ESCALATION,
      ];
      break;
    case RootCause.AUTHENTICATION_OR_CUSTOMER_ACTION_REQUIRED:
      candidates = [
        InterventionType.PAYMENT_LINK,
        InterventionType.SMS_REMINDER,
        InterventionType.EMAIL_REMINDER,
      ];
      break;
    case RootCause.MANDATE_OR_SUBSCRIPTION_ISSUE:
      candidates = [
        InterventionType.PAYMENT_LINK,
        InterventionType.EMAIL_REMINDER,
        InterventionType.HUMAN_ESCALATION,
      ];
      break;
    case RootCause.CHECKOUT_DROP_OFF:
      candidates = [
        InterventionType.SMS_REMINDER,
        InterventionType.EMAIL_REMINDER,
        InterventionType.NO_ACTION,
      ];
      break;
    case RootCause.INVOICE_COLLECTION_DELAY:
      candidates = [InterventionType.EMAIL_REMINDER, InterventionType.HUMAN_ESCALATION];
      break;
    case RootCause.UNKNOWN:
    default:
      candidates = [InterventionType.HUMAN_ESCALATION, InterventionType.NO_ACTION];
      break;
  }

  // Filter by merchant allowed intervention types
  candidates = candidates.filter((type) => merchantPolicy.allowedInterventionTypes.includes(type));

  if (candidates.length === 0) {
    return [InterventionType.NO_ACTION];
  }

  return candidates;
}

export interface ActiveInterventionSummary {
  hasActivePaymentRetry: boolean;
  hasActivePaymentLink: boolean;
  hasActiveCommunication: boolean;
}

export function recommendIntervention(
  revCase: RecoveryCase,
  diagnosis: DiagnosisResult,
  candidates: InterventionType[],
  merchantPolicy: MerchantRecoveryPolicyConfig,
  activeInterventionSummary: ActiveInterventionSummary
): InterventionType {
  if (candidates.length === 0 || candidates.includes(InterventionType.NO_ACTION) && candidates.length === 1) {
    return InterventionType.NO_ACTION;
  }

  if (diagnosis.confidence < merchantPolicy.minimumRecoveryScore / 100) {
    if (candidates.includes(InterventionType.HUMAN_ESCALATION)) {
      return InterventionType.HUMAN_ESCALATION;
    }
    return InterventionType.NO_ACTION;
  }

  if (revCase.amountAtRisk.amountMinor >= merchantPolicy.manualApprovalAboveAmountMinor) {
    if (candidates.includes(InterventionType.HUMAN_ESCALATION)) {
      return InterventionType.HUMAN_ESCALATION;
    }
    // We can also pick a plan but flag it requiresHumanApproval in proposeRecoveryPlan
  }

  // PAYMENT_RETRY is allowed only when:
  // - root cause is transient,
  // - amount is <= maxRetryAmountMinor,
  // - attempts below cap,
  // - merchant allows it,
  // - no existing active intervention exists.
  if (
    candidates.includes(InterventionType.PAYMENT_RETRY) &&
    diagnosis.rootCause === RootCause.TRANSIENT_BANK_OR_NETWORK_FAILURE &&
    revCase.amountAtRisk.amountMinor <= merchantPolicy.maxRetryAmountMinor &&
    revCase.attemptCount < merchantPolicy.maxAttemptsPerCase &&
    !activeInterventionSummary.hasActivePaymentRetry
  ) {
    return InterventionType.PAYMENT_RETRY;
  }

  // For customer-action-required / insufficient-funds: prefer PAYMENT_LINK over direct retry.
  if (
    (diagnosis.rootCause === RootCause.AUTHENTICATION_OR_CUSTOMER_ACTION_REQUIRED ||
      diagnosis.rootCause === RootCause.INSUFFICIENT_FUNDS_LIKELY ||
      diagnosis.rootCause === RootCause.MANDATE_OR_SUBSCRIPTION_ISSUE) &&
    candidates.includes(InterventionType.PAYMENT_LINK) &&
    !activeInterventionSummary.hasActivePaymentLink
  ) {
    return InterventionType.PAYMENT_LINK;
  }

  if (candidates.includes(InterventionType.EMAIL_REMINDER) && !activeInterventionSummary.hasActiveCommunication) {
    return InterventionType.EMAIL_REMINDER;
  }

  if (candidates.includes(InterventionType.SMS_REMINDER) && !activeInterventionSummary.hasActiveCommunication) {
    return InterventionType.SMS_REMINDER;
  }

  if (candidates.includes(InterventionType.HUMAN_ESCALATION)) {
    return InterventionType.HUMAN_ESCALATION;
  }

  return InterventionType.NO_ACTION;
}
