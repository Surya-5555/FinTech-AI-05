import {
  RecoveryCase,
  DiagnosisResult,
  InterventionType,
  MerchantRecoveryPolicyConfig,
  PolicyDecision,
  RecoveryReasonCode,
  RevenueCaseState,
  RootCause,
} from '@rr/contracts';
import { ActiveInterventionSummary } from './intervention';

export interface PolicyEvaluationInput {
  revCase: RecoveryCase;
  diagnosis: DiagnosisResult;
  proposedIntervention: InterventionType;
  merchantPolicy: MerchantRecoveryPolicyConfig;
  activeInterventionSummary: ActiveInterventionSummary;
  now: Date;
  // Note: we would also pass consent state and contact history, omitting for simplicity in this phase
  hasConsentForIntervention?: boolean;
  contactWindowLimitReached?: boolean;
}

export function evaluateRecoveryPolicy(input: PolicyEvaluationInput): PolicyDecision {
  const { revCase, diagnosis, proposedIntervention, merchantPolicy, activeInterventionSummary, hasConsentForIntervention, contactWindowLimitReached } = input;
  
  const reasonCodes: RecoveryReasonCode[] = [];
  let requiresHumanApproval = false;
  let stopCase = false;
  let escalationRequired = false;

  // 1. Check if case is terminal
  if (revCase.state === RevenueCaseState.RECOVERED || revCase.state === RevenueCaseState.FAILED || revCase.state === RevenueCaseState.STOPPED || revCase.state === RevenueCaseState.EXPIRED || revCase.state === RevenueCaseState.REJECTED) {
    return {
      approved: false,
      reasonCodes: [RecoveryReasonCode.TERMINAL_CASE],
      requiresHumanApproval: false,
      stopCase: true,
      escalationRequired: false,
    };
  }

  // 2. Check if merchant policy enabled
  if (!merchantPolicy.enabled) {
    return {
      approved: false,
      reasonCodes: [RecoveryReasonCode.MERCHANT_POLICY_EXCLUDED],
      requiresHumanApproval: false,
      stopCase: true,
      escalationRequired: false,
    };
  }

  // 2.5 Fraud Hard-Block
  if (diagnosis.rootCause === RootCause.FRAUD) {
    reasonCodes.push(RecoveryReasonCode.FRAUD_DETECTED);
    return {
      approved: false,
      reasonCodes,
      requiresHumanApproval: false,
      stopCase: true,
      escalationRequired: false,
    };
  }

  // 3. Attempt cap
  if (revCase.attemptCount >= merchantPolicy.maxAttemptsPerCase) {
    reasonCodes.push(RecoveryReasonCode.ATTEMPT_LIMIT_REACHED);
    return {
      approved: false,
      reasonCodes,
      requiresHumanApproval: false,
      stopCase: true,
      escalationRequired: false,
    };
  }

  // 4. Allowed intervention type
  if (!merchantPolicy.allowedInterventionTypes.includes(proposedIntervention)) {
    reasonCodes.push(RecoveryReasonCode.CHANNEL_NOT_ALLOWED);
    return {
      approved: false,
      reasonCodes,
      requiresHumanApproval: false,
      stopCase: true,
      escalationRequired: false,
    };
  }

  // 5. Recovery score / confidence threshold
  if (diagnosis.confidence < merchantPolicy.minimumRecoveryScore / 100) {
    if (proposedIntervention !== InterventionType.HUMAN_ESCALATION && proposedIntervention !== InterventionType.NO_ACTION) {
      reasonCodes.push(RecoveryReasonCode.LOW_CONFIDENCE_ESCALATION);
      return {
        approved: false,
        reasonCodes,
        requiresHumanApproval: true,
        stopCase: false,
        escalationRequired: true,
      };
    }
  }

  // 6. Retry money limit
  if (proposedIntervention === InterventionType.PAYMENT_RETRY) {
    if (revCase.amountAtRisk.amountMinor > merchantPolicy.maxRetryAmountMinor) {
      reasonCodes.push(RecoveryReasonCode.RETRY_AMOUNT_LIMIT_EXCEEDED);
      return {
        approved: false,
        reasonCodes,
        requiresHumanApproval: false,
        stopCase: true,
        escalationRequired: true,
      };
    }
  }

  // 7. Consent and contact limits (if provided)
  if (hasConsentForIntervention === false) {
    reasonCodes.push(RecoveryReasonCode.CONSENT_MISSING);
    return {
      approved: false,
      reasonCodes,
      requiresHumanApproval: false,
      stopCase: true,
      escalationRequired: false,
    };
  }

  // 8. Manual approval threshold
  if (revCase.amountAtRisk.amountMinor >= merchantPolicy.manualApprovalAboveAmountMinor) {
    requiresHumanApproval = true;
    reasonCodes.push(RecoveryReasonCode.HUMAN_APPROVAL_REQUIRED);
  }

  if (contactWindowLimitReached) {
    // block communication
    if (proposedIntervention === InterventionType.EMAIL_REMINDER || proposedIntervention === InterventionType.SMS_REMINDER || proposedIntervention === InterventionType.VOICE_REMINDER) {
       return {
         approved: false,
         reasonCodes: [RecoveryReasonCode.ATTEMPT_LIMIT_REACHED], // reusing attempt limit reached or we can add a specific one
         requiresHumanApproval: false,
         stopCase: false,
         escalationRequired: false,
         retryAfter: new Date(input.now.getTime() + merchantPolicy.contactRules.messageWindowHours * 60 * 60 * 1000)
       };
    }
  }

  if (proposedIntervention === InterventionType.HUMAN_ESCALATION) {
    escalationRequired = true;
    requiresHumanApproval = true;
  }

  if (proposedIntervention === InterventionType.NO_ACTION) {
    stopCase = true;
    reasonCodes.push(RecoveryReasonCode.NO_SAFE_INTERVENTION);
    return {
      approved: false,
      reasonCodes,
      requiresHumanApproval: false,
      stopCase,
      escalationRequired,
    };
  }

  return {
    approved: true,
    reasonCodes,
    requiresHumanApproval,
    stopCase: false,
    escalationRequired,
    approvedIntervention: proposedIntervention,
  };
}
