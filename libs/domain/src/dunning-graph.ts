import { StateGraph, START, END } from '@langchain/langgraph';
import { 
  RecoveryCase, 
  RevenueEvent, 
  MerchantRecoveryPolicyConfig, 
  RevenueCaseState, 
  RecoveryPlan, 
  PolicyDecision 
} from '@rr/contracts';
import { ActiveInterventionSummary, selectCandidateInterventions, recommendIntervention } from './intervention';
import { diagnoseRevenueCase } from './diagnosis';
import { evaluateRecoveryPolicy } from './policy';
import { scorePropensity } from './ml/propensity';
import { isOutsideTRAIWindow } from './utils/time-compliance';
import { generateId } from '@rr/utils';
import { DiagnosisResult, InterventionType, RootCause } from '@rr/contracts';

export interface DunningState {
  revCase: RecoveryCase;
  sourceEvent: RevenueEvent;
  merchantPolicy: MerchantRecoveryPolicyConfig;
  activeInterventionSummary: ActiveInterventionSummary;
  now: Date;
  
  diagnosis?: DiagnosisResult;
  shadowPropensity?: number;
  candidates?: InterventionType[];
  recommended?: InterventionType;
  policyDecision?: PolicyDecision;
  plan?: RecoveryPlan;
  resultingCaseState?: RevenueCaseState;
  [key: string]: unknown;
}

const dunningGraph = new StateGraph<DunningState, Partial<DunningState>, unknown>({
  channels: {
    revCase: { value: (left: RecoveryCase, right: RecoveryCase) => right ?? left, default: () => null as unknown as RecoveryCase },
    sourceEvent: { value: (left: RevenueEvent, right: RevenueEvent) => right ?? left, default: () => null as unknown as RevenueEvent },
    merchantPolicy: { value: (left: MerchantRecoveryPolicyConfig, right: MerchantRecoveryPolicyConfig) => right ?? left, default: () => null as unknown as MerchantRecoveryPolicyConfig },
    activeInterventionSummary: { value: (left: ActiveInterventionSummary, right: ActiveInterventionSummary) => right ?? left, default: () => null as unknown as ActiveInterventionSummary },
    now: { value: (left: Date, right: Date) => right ?? left, default: () => null as unknown as Date },
    diagnosis: { value: (left: DiagnosisResult | undefined, right: DiagnosisResult | undefined) => right ?? left, default: () => undefined },
    shadowPropensity: { value: (left: number | undefined, right: number | undefined) => right ?? left, default: () => undefined },
    candidates: { value: (left: InterventionType[] | undefined, right: InterventionType[] | undefined) => right ?? left, default: () => undefined },
    recommended: { value: (left: InterventionType | undefined, right: InterventionType | undefined) => right ?? left, default: () => undefined },
    policyDecision: { value: (left: PolicyDecision | undefined, right: PolicyDecision | undefined) => right ?? left, default: () => undefined },
    plan: { value: (left: RecoveryPlan | undefined, right: RecoveryPlan | undefined) => right ?? left, default: () => undefined },
    resultingCaseState: { value: (left: RevenueCaseState | undefined, right: RevenueCaseState | undefined) => right ?? left, default: () => undefined },
  } as any
});

dunningGraph.addNode('score_propensity', async (state: DunningState) => {
  const propensity = await scorePropensity(state.revCase, state.sourceEvent);
  return { shadowPropensity: propensity };
});

dunningGraph.addNode('diagnose', async (state: DunningState) => {
  const diagnosis = diagnoseRevenueCase(state.revCase, state.sourceEvent, state.merchantPolicy, state.now);
  diagnosis.shadowPropensity = state.shadowPropensity;
  return { diagnosis };
});

dunningGraph.addNode('recommend', async (state: DunningState) => {
  if (!state.diagnosis) throw new Error('Diagnosis missing');
  const candidates = selectCandidateInterventions(state.revCase, state.diagnosis, state.merchantPolicy);
  state.diagnosis.candidateInterventions = candidates;
  let recommended = recommendIntervention(state.revCase, state.diagnosis, candidates, state.merchantPolicy, state.activeInterventionSummary);

  // Smart Dunning Overrides (Typed RootCause & Event Failure Reason)
  const rootCause = state.diagnosis.rootCause;
  const failureReason = state.sourceEvent.failureReason?.toUpperCase() || '';
  const attemptCount = state.revCase.attemptCount;
  
  if (
    (failureReason === 'CARD_EXPIRED' || failureReason === 'EXPIRED_CARD' || rootCause === RootCause.AUTHENTICATION_OR_CUSTOMER_ACTION_REQUIRED) &&
    candidates.includes(InterventionType.PAYMENT_LINK)
  ) {
    recommended = InterventionType.PAYMENT_LINK;
  } else if (
    (rootCause === RootCause.TRANSIENT_BANK_OR_NETWORK_FAILURE || failureReason === 'BANK_TIMEOUT' || failureReason === 'NETWORK_ERROR') &&
    attemptCount < 3 &&
    candidates.includes(InterventionType.PAYMENT_RETRY)
  ) {
    recommended = InterventionType.PAYMENT_RETRY;
  }

  state.diagnosis.recommendedIntervention = recommended;
  return { candidates, recommended, diagnosis: state.diagnosis };
});

dunningGraph.addNode('evaluate_policy', async (state: DunningState) => {
  let hasConsentForIntervention = true;
  if (state.sourceEvent.metadata?.customerConsents) {
    const consents = state.sourceEvent.metadata.customerConsents as unknown as Record<string, boolean>;
    if (state.recommended === InterventionType.EMAIL_REMINDER && consents.email === false) hasConsentForIntervention = false;
    if (state.recommended === InterventionType.SMS_REMINDER && consents.sms === false) hasConsentForIntervention = false;
    if (state.recommended === InterventionType.VOICE_REMINDER && consents.voice === false) hasConsentForIntervention = false;
  }

  let contactWindowLimitReached = false;
  if (isOutsideTRAIWindow(state.now)) {
    contactWindowLimitReached = true;
  }
  
  if (state.sourceEvent.metadata?.contactWindowMetadataJson) {
    try {
      const metadata = JSON.parse(state.sourceEvent.metadata.contactWindowMetadataJson as string);
      const attemptsToday = metadata.attemptsToday || 0;
      if (attemptsToday >= (state.merchantPolicy.contactRules?.maxMessagesPerCustomerWindow || 3)) {
        contactWindowLimitReached = true;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!state.diagnosis) throw new Error('Diagnosis missing');
  
  const policyDecision = evaluateRecoveryPolicy({
    revCase: state.revCase,
    diagnosis: state.diagnosis,
    proposedIntervention: state.recommended as any,
    merchantPolicy: state.merchantPolicy,
    activeInterventionSummary: state.activeInterventionSummary,
    hasConsentForIntervention,
    contactWindowLimitReached,
    now: state.now,
  });

  return { policyDecision };
});

dunningGraph.addNode('create_plan', async (state: any) => {
  const { revCase, merchantPolicy, recommended, policyDecision, now } = state;
  const idempotencyKey = `${revCase.caseId}_${merchantPolicy.policyVersion}_${recommended}_${revCase.attemptCount + 1}` as any;
  
  let plannedAt = now;
  if (revCase.rootCause === 'insufficient_funds' && recommended === InterventionType.PAYMENT_RETRY) {
    const nextPayday = new Date(now);
    // Move to 1st of next month for payday heuristics
    nextPayday.setMonth(nextPayday.getMonth() + 1);
    nextPayday.setDate(1);
    nextPayday.setHours(9, 0, 0, 0);
    plannedAt = nextPayday;
  }

  const plan: RecoveryPlan = {
    planId: generateId('plan') as any,
    caseId: revCase.caseId,
    interventionType: recommended as any,
    plannedAt,
    reasonCodes: policyDecision!.reasonCodes.map((r: any) => r.toString()),
    policyVersion: merchantPolicy.policyVersion,
    requiresHumanApproval: policyDecision!.requiresHumanApproval,
    idempotencyKey,
    parameters: recommended === InterventionType.PAYMENT_LINK ? { paymentLinkId: 'plink_' + generateId('link') } : {}, 
    planStatus: policyDecision!.approved ? 'POLICY_APPROVED' as any : 'POLICY_REJECTED' as any,
  };

  return { plan };
});

// Build the sequential pipeline for now. 
// In a true multi-step graph, we'd add conditional edges back to wait nodes or escalation.
dunningGraph.addEdge(START, 'score_propensity' as any);
dunningGraph.addEdge('score_propensity' as any, 'diagnose' as any);
dunningGraph.addEdge('diagnose' as any, 'recommend' as any);
dunningGraph.addEdge('recommend' as any, 'evaluate_policy' as any);
dunningGraph.addEdge('evaluate_policy' as any, 'create_plan' as any);
dunningGraph.addEdge('create_plan' as any, END);

export const dunningWorkflow = dunningGraph.compile();
