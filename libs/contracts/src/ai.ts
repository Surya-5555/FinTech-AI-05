import { RevenueCaseId, InterventionId, CorrelationId } from './identifiers.js';

export enum AIUseCase {
  RECOVERY_MESSAGE_DRAFT = 'RECOVERY_MESSAGE_DRAFT',
  RECOVERY_DECISION_EXPLANATION = 'RECOVERY_DECISION_EXPLANATION',
}

export enum AILocale {
  EN_IN = 'en-IN',
  HI_IN = 'hi-IN',
  HINGLISH = 'hinglish',
}

export enum AIDataClassification {
  SYNTHETIC = 'SYNTHETIC',
  MASKED_DEMO = 'MASKED_DEMO',
}

export enum AIFallbackSource {
  LLM = 'LLM',
  DETERMINISTIC_FALLBACK = 'DETERMINISTIC_FALLBACK',
}

export enum AIInvocationStatus {
  SUCCEEDED = 'SUCCEEDED',
  FALLBACK_USED = 'FALLBACK_USED',
  TIMEOUT = 'TIMEOUT',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  SAFETY_REJECTED = 'SAFETY_REJECTED',
  DISABLED = 'DISABLED',
}

export interface AIRequestContext {
  requestId: string;
  correlationId: CorrelationId;
  useCase: AIUseCase;
  locale: AILocale;
  merchantDisplayName: string;
  maskedCustomerReference: string;
  amountDisplay: string;
  currency: string;
  eventType: string;
  failureReason: string;
  rootCause: string;
  interventionType: string;
  policyReasonCodes: string[];
  maxAttemptsRemaining: number;
  channel: string;
  constraints: {
    maxCharacters: number;
    forbiddenClaims: string[];
    requiredDisclosure?: string;
    allowedTone: string;
  };
  dataClassification: AIDataClassification;
}

export interface RecoveryMessageDraft {
  text: string;
  locale: AILocale;
  channel: string;
  templateVersion: string;
  safetyChecks: {
    passed: boolean;
    issues: string[];
  };
  source: AIFallbackSource;
}

export interface DecisionExplanation {
  summary: string;
  bulletReasons: string[];
  policyBoundaryStatement: string;
  source: AIFallbackSource;
}

export interface AIResponseSafetyResult {
  accepted: boolean;
  reasonCodes: string[];
  redactionsApplied: string[];
  fallbackRequired: boolean;
}

export interface AIInvocationRecord {
  id: string;
  useCase: AIUseCase;
  providerName?: string;
  modelName?: string;
  promptVersion: string;
  inputHash: string;
  outputHash?: string;
  status: AIInvocationStatus;
  latencyMs?: number;
  estimatedCostMinor?: number;
  correlationId: string;
  createdAt: Date;
}
