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
  DiagnosisResult,
} from '@rr/contracts';
import { generateId } from '@rr/utils';
import { diagnoseRevenueCase } from './diagnosis';
import { ActiveInterventionSummary, recommendIntervention, selectCandidateInterventions } from './intervention';
import { evaluateRecoveryPolicy } from './policy';
import { dunningWorkflow, DunningState } from './dunning-graph';

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
  diagnosis: DiagnosisResult;
  policyDecision: PolicyDecision;
  resultingCaseState: RevenueCaseState;
}

export async function proposeRecoveryPlan(input: PlanProposalInput): Promise<RecoveryPlanProposal> {
  const { revCase, sourceEvent, merchantPolicy, activeInterventionSummary, now } = input;

  if (revCase.state !== RevenueCaseState.DETECTED && revCase.state !== RevenueCaseState.RETRYABLE) {
    throw new Error(`Cannot propose plan for case in state ${revCase.state}`);
  }

  // Execute LangGraph State Machine
  const initialState: DunningState = {
    revCase,
    sourceEvent,
    merchantPolicy,
    activeInterventionSummary,
    now
  };
  
  const finalState = await dunningWorkflow.invoke(initialState) as DunningState;
  
  // Extract results from graph execution
  const diagnosis = finalState.diagnosis;
  const policyDecision = finalState.policyDecision;
  const plan = finalState.plan;
  
  if (!diagnosis || !policyDecision || !plan) {
    throw new Error('LangGraph Dunning Orchestration failed to produce a complete plan');
  }

  // State transition
  const resultingCaseState = resolvePlanningOutcome(revCase, policyDecision);

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
