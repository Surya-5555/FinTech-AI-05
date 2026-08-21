import { RecoveryPlanId, RevenueCaseId, IdempotencyKey } from './identifiers.js';

export enum InterventionType {
  PAYMENT_RETRY = 'PAYMENT_RETRY',
  PAYMENT_LINK = 'PAYMENT_LINK',
  EMAIL_REMINDER = 'EMAIL_REMINDER',
  SMS_REMINDER = 'SMS_REMINDER',
  VOICE_REMINDER = 'VOICE_REMINDER',
  HUMAN_ESCALATION = 'HUMAN_ESCALATION',
  NO_ACTION = 'NO_ACTION',
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
}
