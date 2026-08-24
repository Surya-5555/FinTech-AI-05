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
import { diagnoseRevenueCase } from './diagnosis';
import { ActiveInterventionSummary, recommendIntervention, selectCandidateInterventions } from './intervention';
import { evaluateRecoveryPolicy } from './policy';

import { scorePropensity } from './ml/propensity';
import { isOutsideTRAIWindow } from './utils/time-compliance';

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

export async function proposeRecoveryPlan(input: PlanProposalInput): Promise<RecoveryPlanProposal> {
  const { revCase, sourceEvent, merchantPolicy, activeInterventionSummary, now } = input;

  if (revCase.state !== RevenueCaseState.DETECTED && revCase.state !== RevenueCaseState.RETRYABLE) {
    throw new Error(`Cannot propose plan for case in state ${revCase.state}`);
  }

  // 0. Shadow ML Propensity Scoring
  const shadowPropensity = await scorePropensity(revCase, sourceEvent);

  // 1. Diagnose
  const diagnosis = diagnoseRevenueCase(revCase, sourceEvent, merchantPolicy, now);
  
  // Attach shadow ML scores for audit logs (does NOT affect deterministic decisions yet)
  diagnosis.shadowPropensity = shadowPropensity;

  // 2. Select Candidates
  const candidates = selectCandidateInterventions(revCase, diagnosis, merchantPolicy);
  diagnosis.candidateInterventions = candidates;

  // 3. Recommend Intervention
  const recommended = recommendIntervention(revCase, diagnosis, candidates, merchantPolicy, activeInterventionSummary);
  diagnosis.recommendedIntervention = recommended;

  // 4. Evaluate Policy
  let hasConsentForIntervention = true;
  if (sourceEvent.metadata?.customerConsents) {
    const consents = sourceEvent.metadata.customerConsents as any;
    if (recommended === 'EMAIL_REMINDER' && consents.email === false) hasConsentForIntervention = false;
    if (recommended === 'SMS_REMINDER' && consents.sms === false) hasConsentForIntervention = false;
    if (recommended === 'VOICE_REMINDER' && consents.voice === false) hasConsentForIntervention = false;
  }

  let contactWindowLimitReached = false;
  if (isOutsideTRAIWindow(now)) {
    contactWindowLimitReached = true;
  }
  
  if (sourceEvent.metadata?.contactWindowMetadataJson) {
    try {
      const metadata = JSON.parse(sourceEvent.metadata.contactWindowMetadataJson as string);
      const attemptsToday = metadata.attemptsToday || 0;
      if (attemptsToday >= (merchantPolicy.contactRules?.maxMessagesPerCustomerWindow || 3)) {
        contactWindowLimitReached = true;
      }
    } catch (e) {
      // ignore parsing errors
    }
  }

  const policyDecision = evaluateRecoveryPolicy({
    revCase,
    diagnosis,
    proposedIntervention: recommended,
    merchantPolicy,
    activeInterventionSummary,
    hasConsentForIntervention,
    contactWindowLimitReached,
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
