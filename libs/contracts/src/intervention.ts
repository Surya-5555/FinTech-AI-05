import { InterventionId, CorrelationId } from './identifiers';
import { Money } from './money';

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
