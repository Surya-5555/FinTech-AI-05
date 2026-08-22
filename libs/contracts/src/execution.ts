import { InterventionId, RevenueCaseId, MerchantId, IdempotencyKey } from './identifiers';
import { Money } from './money';

export enum ExecutionActionType {
  CREATE_PAYMENT_LINK = 'CREATE_PAYMENT_LINK',
  INITIATE_PAYMENT_RETRY = 'INITIATE_PAYMENT_RETRY',
  SEND_EMAIL_REMINDER = 'SEND_EMAIL_REMINDER',
  SEND_SMS_REMINDER = 'SEND_SMS_REMINDER',
  SEND_VOICE_REMINDER = 'SEND_VOICE_REMINDER',
  CREATE_HUMAN_ESCALATION = 'CREATE_HUMAN_ESCALATION',
  NO_EXTERNAL_ACTION = 'NO_EXTERNAL_ACTION',
}

export enum ExternalActionErrorCode {
  PROVIDER_TIMEOUT = 'PROVIDER_TIMEOUT',
  PROVIDER_REJECTED = 'PROVIDER_REJECTED',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  RATE_LIMITED = 'RATE_LIMITED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface InterventionExecutionRequest {
  interventionId: InterventionId;
  caseId: RevenueCaseId;
  merchantId: MerchantId;
  actionType: ExecutionActionType;
  amountMinor: bigint;
  currency: string;
  parameters: Record<string, string | number | boolean>;
  idempotencyKey: IdempotencyKey;
}

export interface ProviderExecutionResult {
  success: boolean;
  externalReference?: string;
  recoveredAmount?: Money;
  failureCode?: ExternalActionErrorCode;
  retryAfter?: Date;
  rawResponseSnippet?: string;
}

export interface ExecutionProvider {
  execute(request: InterventionExecutionRequest): Promise<ProviderExecutionResult>;
}

export interface InterventionExecutionResult {
  interventionId: InterventionId;
  status: 'SUCCEEDED' | 'FAILED' | 'RETRY_SCHEDULED' | 'ESCALATED' | 'STOPPED';
  executedAt: Date;
  recoveredAmount?: Money;
  externalReference?: string;
  failureCode?: ExternalActionErrorCode | string;
  retryAfter?: Date;
}
