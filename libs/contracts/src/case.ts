import { RevenueCaseId, EventId, MerchantId, CustomerId, CorrelationId } from './identifiers';
import { Money } from './money';

export enum RevenueCaseState {
  DETECTED = 'DETECTED',
  QUALIFIED = 'QUALIFIED',
  DIAGNOSED = 'DIAGNOSED',
  PLANNED = 'PLANNED',
  POLICY_CHECKED = 'POLICY_CHECKED',
  QUEUED = 'QUEUED',
  EXECUTING = 'EXECUTING',
  AWAITING_CUSTOMER_ACTION = 'AWAITING_CUSTOMER_ACTION',
  RECOVERED = 'RECOVERED',
  AMBIGUOUS = 'AMBIGUOUS',
  FAILED = 'FAILED',
  RETRYABLE = 'RETRYABLE',
  ESCALATED = 'ESCALATED',
  STOPPED = 'STOPPED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
}

export interface RecoveryCase {
  caseId: RevenueCaseId;
  sourceEventId: EventId;
  merchantId: MerchantId;
  customerId: CustomerId;
  amountAtRisk: Money;
  state: RevenueCaseState;
  attemptCount: number;
  recoveryScore?: number;
  rootCause?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  correlationId: CorrelationId;
}
