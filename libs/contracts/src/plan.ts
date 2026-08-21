import { RecoveryPlanId, RevenueCaseId, IdempotencyKey } from './identifiers.js';
import { DiagnosisResult, PolicyDecision } from './policy.js';
import { RevenueCaseState } from './case.js';
export enum InterventionType {
  PAYMENT_RETRY = 'PAYMENT_RETRY',
  PAYMENT_LINK = 'PAYMENT_LINK',
  EMAIL_REMINDER = 'EMAIL_REMINDER',
  SMS_REMINDER = 'SMS_REMINDER',
  VOICE_REMINDER = 'VOICE_REMINDER',
  HUMAN_ESCALATION = 'HUMAN_ESCALATION',
  NO_ACTION = 'NO_ACTION',
}

export enum RecoveryPlanStatus {
  PROPOSED = 'PROPOSED',
  POLICY_APPROVED = 'POLICY_APPROVED',
  POLICY_REJECTED = 'POLICY_REJECTED',
  SUPERSEDED = 'SUPERSEDED',
  CANCELLED = 'CANCELLED',
  EXECUTED = 'EXECUTED',
}

export interface RecoveryPlan {
  planId: RecoveryPlanId;
  caseId: RevenueCaseId;
  interventionType: InterventionType;
  plannedAt: Date;
  reasonCodes: string[];
  policyVersion: string;
  requiresHumanApproval: boolean;
  idempotencyKey: IdempotencyKey;
  parameters: Record<string, string | number | boolean>;
  planStatus: RecoveryPlanStatus;
}

export interface PlanDecisionResponse {
  caseId: RevenueCaseId;
  plan: RecoveryPlan;
  diagnosis: DiagnosisResult;
  policyDecision: PolicyDecision;
  resultingCaseState: RevenueCaseState;
  idempotentReplay: boolean;
  correlationId: string;
}
