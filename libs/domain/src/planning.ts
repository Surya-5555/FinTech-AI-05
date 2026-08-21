import {
  RecoveryCase,
  RevenueEvent,
  MerchantRecoveryPolicyConfig,
  RevenueCaseState,
  PolicyDecision,
  RecoveryPlan,
  RecoveryPlanStatus,
  IdempotencyKey,
  RecoveryPlanId,
} from '@rr/contracts';
import { generateId } from '@rr/utils';
import { diagnoseRevenueCase } from './diagnosis.js';
import { ActiveInterventionSummary, recommendIntervention, selectCandidateInterventions } from './intervention.js';
import { evaluateRecoveryPolicy } from './policy.js';

export interface PlanProposalInput {
  revCase: RecoveryCase;
  sourceEvent: RevenueEvent;
  merchantPolicy: MerchantRecoveryPolicyConfig;
  activeInterventionSummary: ActiveInterventionSummary;
  now: Date;
}

export interface RecoveryPlanProposal {
  plan: RecoveryPlan;
  diagnosis: any; // DiagnosisResult
  policyDecision: PolicyDecision;
  resultingCaseState: RevenueCaseState;
}

export function proposeRecoveryPlan(input: PlanProposalInput): RecoveryPlanProposal {
  const { revCase, sourceEvent, merchantPolicy, activeInterventionSummary, now } = input;

  if (revCase.state !== RevenueCaseState.DETECTED && revCase.state !== RevenueCaseState.RETRYABLE) {
    throw new Error(`Cannot propose plan for case in state ${revCase.state}`);
  }

  // 1. Diagnose
  const diagnosis = diagnoseRevenueCase(revCase, sourceEvent, merchantPolicy, now);

  // 2. Select Candidates
  const candidates = selectCandidateInterventions(revCase, diagnosis, merchantPolicy);
  diagnosis.candidateInterventions = candidates;

  // 3. Recommend Intervention
  const recommended = recommendIntervention(revCase, diagnosis, candidates, merchantPolicy, activeInterventionSummary);
  diagnosis.recommendedIntervention = recommended;

  // 4. Evaluate Policy
  const policyDecision = evaluateRecoveryPolicy({
    revCase,
    diagnosis,
    proposedIntervention: recommended,
    merchantPolicy,
    activeInterventionSummary,
    now,
  });

  // 5. Build deterministic ID/idempotency key
  // Plan idempotency: caseId + policyVersion + intervention + attempt
  const idempotencyKey = `${revCase.caseId}_${merchantPolicy.policyVersion}_${recommended}_${revCase.attemptCount + 1}` as IdempotencyKey;

  // 6. State transition
  const resultingCaseState = resolvePlanningOutcome(revCase, policyDecision);

  // 7. Construct Plan
  const plan: RecoveryPlan = {
    planId: generateId('plan') as RecoveryPlanId,
    caseId: revCase.caseId,
    interventionType: recommended,
    plannedAt: now,
    reasonCodes: policyDecision.reasonCodes.map(r => r.toString()),
    policyVersion: merchantPolicy.policyVersion,
    requiresHumanApproval: policyDecision.requiresHumanApproval,
    idempotencyKey,
    parameters: {}, // No params in this phase
    planStatus: policyDecision.approved ? RecoveryPlanStatus.POLICY_APPROVED : RecoveryPlanStatus.POLICY_REJECTED,
  };

  return {
    plan,
    diagnosis,
    policyDecision,
    resultingCaseState,
  };
}

export function resolvePlanningOutcome(revCase: RecoveryCase, policyDecision: PolicyDecision): RevenueCaseState {
  // Rules:
  // - approved and no human approval required → POLICY_CHECKED.
  // - approved but human approval required → ESCALATED.
  // - rejected and stopCase true → STOPPED.
  // - rejected and escalationRequired true → ESCALATED.
  // - rejected but retryable later → RETRYABLE.
  // - invalid terminal case → no transition / domain error.

  if (revCase.state === RevenueCaseState.RECOVERED || revCase.state === RevenueCaseState.FAILED || revCase.state === RevenueCaseState.STOPPED || revCase.state === RevenueCaseState.EXPIRED || revCase.state === RevenueCaseState.REJECTED) {
    throw new Error(`Cannot resolve outcome for terminal case in state ${revCase.state}`);
  }

  if (policyDecision.approved) {
    if (policyDecision.requiresHumanApproval) {
      return RevenueCaseState.ESCALATED;
    }
    return RevenueCaseState.POLICY_CHECKED;
  } else {
    if (policyDecision.stopCase) {
      return RevenueCaseState.STOPPED;
    }
    if (policyDecision.escalationRequired) {
      return RevenueCaseState.ESCALATED;
    }
    return RevenueCaseState.RETRYABLE;
  }
}
