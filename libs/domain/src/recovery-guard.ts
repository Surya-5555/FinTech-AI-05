import { RecoveryPlan, RecoveryCase, RecoveryPolicy, PolicyDecision, ConsentStatus, RevenueCaseState } from '@rr/contracts';
import { evaluateRecoveryPolicy } from './policy-evaluator.js';

export function validateRecoveryPlan(plan: RecoveryPlan, rc: RecoveryCase, policy: RecoveryPolicy, consent: ConsentStatus): PolicyDecision {
  if (rc.state !== RevenueCaseState.PLANNED) {
    return {
      approved: false,
      reasonCodes: ['CASE_NOT_IN_PLANNED_STATE'],
      requiresHumanApproval: false,
      stopCase: false,
    };
  }

  if (plan.caseId !== rc.caseId) {
    return {
      approved: false,
      reasonCodes: ['PLAN_CASE_MISMATCH'],
      requiresHumanApproval: false,
      stopCase: false,
    };
  }

  return evaluateRecoveryPolicy({
    rc,
    policy,
    interventionType: plan.interventionType,
    consentStatus: consent,
  });
}
