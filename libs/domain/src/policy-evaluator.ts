import { RecoveryCase, RecoveryPolicy, PolicyDecision, ConsentStatus, InterventionType } from '@rr/contracts';
import { isTerminal } from './state-machine.js';

export interface PolicyInput {
  rc: RecoveryCase;
  policy: RecoveryPolicy;
  interventionType: InterventionType;
  consentStatus: ConsentStatus;
  retryAmountMinor?: bigint;
}

export function evaluateRecoveryPolicy(input: PolicyInput): PolicyDecision {
  const reasons: string[] = [];
  let stopCase = false;
  let approved = true;

  if (isTerminal(input.rc.state)) {
    reasons.push('CASE_ALREADY_TERMINAL');
    approved = false;
    stopCase = true;
  }

  if (input.rc.attemptCount >= input.policy.maxAttemptsPerCase) {
    reasons.push('MAX_ATTEMPTS_EXCEEDED');
    approved = false;
    stopCase = true;
  }

  if (input.rc.recoveryScore !== undefined && input.rc.recoveryScore < input.policy.minimumRecoveryScore) {
    reasons.push('SCORE_TOO_LOW');
    approved = false;
  }

  if (!input.policy.allowedInterventionTypes.includes(input.interventionType)) {
    reasons.push('INTERVENTION_NOT_ALLOWED');
    approved = false;
  }

  if (input.consentStatus === ConsentStatus.DENIED) {
    reasons.push('CONSENT_DENIED');
    approved = false;
    stopCase = true;
  }
  
  if (input.consentStatus === ConsentStatus.UNKNOWN && input.policy.requiredConsentChannels.length > 0) {
    reasons.push('CONSENT_UNKNOWN');
    approved = false;
  }

  if (input.retryAmountMinor !== undefined && input.retryAmountMinor > input.policy.maxRetryAmountMinor) {
    reasons.push('RETRY_AMOUNT_EXCEEDS_MAX');
    approved = false;
  }

  const requiresHumanApproval = (input.rc.recoveryScore !== undefined && input.rc.recoveryScore < input.policy.lowConfidenceEscalationThreshold);
  if (requiresHumanApproval) {
    reasons.push('REQUIRES_HUMAN_APPROVAL');
  }

  return {
    approved,
    reasonCodes: reasons,
    requiresHumanApproval,
    stopCase,
  };
}
