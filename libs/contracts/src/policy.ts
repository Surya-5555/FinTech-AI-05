import { InterventionType } from './plan';

export enum ConsentStatus {
  GRANTED = 'GRANTED',
  DENIED = 'DENIED',
  UNKNOWN = 'UNKNOWN',
  EXPIRED = 'EXPIRED',
}

export enum RootCause {
  TRANSIENT_BANK_OR_NETWORK_FAILURE = 'TRANSIENT_BANK_OR_NETWORK_FAILURE',
  INSUFFICIENT_FUNDS_LIKELY = 'INSUFFICIENT_FUNDS_LIKELY',
  AUTHENTICATION_OR_CUSTOMER_ACTION_REQUIRED = 'AUTHENTICATION_OR_CUSTOMER_ACTION_REQUIRED',
  MANDATE_OR_SUBSCRIPTION_ISSUE = 'MANDATE_OR_SUBSCRIPTION_ISSUE',
  CHECKOUT_DROP_OFF = 'CHECKOUT_DROP_OFF',
  INVOICE_COLLECTION_DELAY = 'INVOICE_COLLECTION_DELAY',
  UNKNOWN = 'UNKNOWN',
}

export enum RecoveryReasonCode {
  FAILURE_REASON_TRANSIENT = 'FAILURE_REASON_TRANSIENT',
  FAILURE_REASON_INSUFFICIENT_FUNDS = 'FAILURE_REASON_INSUFFICIENT_FUNDS',
  FAILURE_REASON_AUTH_REQUIRED = 'FAILURE_REASON_AUTH_REQUIRED',
  FAILURE_REASON_MANDATE = 'FAILURE_REASON_MANDATE',
  CHECKOUT_ABANDONED = 'CHECKOUT_ABANDONED',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  AMOUNT_BELOW_THRESHOLD = 'AMOUNT_BELOW_THRESHOLD',
  EVENT_TOO_STALE = 'EVENT_TOO_STALE',
  ATTEMPT_LIMIT_REACHED = 'ATTEMPT_LIMIT_REACHED',
  CONSENT_MISSING = 'CONSENT_MISSING',
  CHANNEL_NOT_ALLOWED = 'CHANNEL_NOT_ALLOWED',
  RETRY_AMOUNT_LIMIT_EXCEEDED = 'RETRY_AMOUNT_LIMIT_EXCEEDED',
  LOW_CONFIDENCE_ESCALATION = 'LOW_CONFIDENCE_ESCALATION',
  HUMAN_APPROVAL_REQUIRED = 'HUMAN_APPROVAL_REQUIRED',
  TERMINAL_CASE = 'TERMINAL_CASE',
  NO_SAFE_INTERVENTION = 'NO_SAFE_INTERVENTION',
  MERCHANT_POLICY_EXCLUDED = 'MERCHANT_POLICY_EXCLUDED',
}

export interface DiagnosisResult {
  rootCause: RootCause;
  confidence: number;
  reasonCodes: RecoveryReasonCode[];
  candidateInterventions: InterventionType[];
  recommendedIntervention: InterventionType;
  requiresHumanReview: boolean;
  evaluatedAt: Date;
  shadowPropensity?: any;
}

export interface MerchantRecoveryPolicyConfig {
  merchantId: string;
  policyVersion: string;
  enabled: boolean;
  allowedInterventionTypes: InterventionType[];
  maxAttemptsPerCase: number;
  maxRetryAmountMinor: bigint;
  minimumRecoveryScore: number;
  manualApprovalAboveAmountMinor: bigint;
  contactRules: {
    maxMessagesPerCustomerWindow: number;
    messageWindowHours: number;
    requiredConsentChannels: string[];
  };
  staleEventLimitHours: number;
  featureFlags: Record<string, boolean>;
  updatedAt: Date;
}

export interface PolicyDecision {
  approved: boolean;
  reasonCodes: RecoveryReasonCode[];
  requiresHumanApproval: boolean;
  stopCase: boolean;
  escalationRequired: boolean;
  retryAfter?: Date;
  approvedIntervention?: InterventionType;
}
