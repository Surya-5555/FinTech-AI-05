import { InterventionType } from './plan.js';

export enum ConsentStatus {
  GRANTED = 'GRANTED',
  DENIED = 'DENIED',
  UNKNOWN = 'UNKNOWN',
  EXPIRED = 'EXPIRED',
}

export interface RecoveryPolicy {
  policyVersion: string;
  maxAttemptsPerCase: number;
  maxMessagesPerCustomerWindow: number;
  messageWindowHours: number;
  maxRetryAmountMinor: bigint;
  minimumRecoveryScore: number;
  lowConfidenceEscalationThreshold: number;
  allowedInterventionTypes: InterventionType[];
  requiredConsentChannels: string[];
}

export interface PolicyDecision {
  approved: boolean;
  reasonCodes: string[];
  requiresHumanApproval: boolean;
  stopCase: boolean;
}
