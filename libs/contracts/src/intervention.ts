import { InterventionId, CorrelationId } from './identifiers.js';
import { Money } from './money.js';

export enum InterventionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTING = 'EXECUTING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  RETRY_SCHEDULED = 'RETRY_SCHEDULED',
  ESCALATED = 'ESCALATED',
  STOPPED = 'STOPPED',
}

export interface InterventionOutcome {
  interventionId: InterventionId;
  status: InterventionStatus;
  executedAt: Date;
  recoveredAmount?: Money;
  externalReference?: string;
  failureCode?: string;
  retryAfter?: Date;
  correlationId: CorrelationId;
}
