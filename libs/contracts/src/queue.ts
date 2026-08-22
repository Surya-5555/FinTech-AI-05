import { IdempotencyKey, RevenueCaseId, RecoveryPlanId, CorrelationId } from './identifiers';

export enum QueueJobStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DELAYED = 'DELAYED',
  UNKNOWN = 'UNKNOWN',
}

export interface EnqueueResult {
  jobId: string;
  status: QueueJobStatus;
}

export interface RecoveryPlanExecutionJob {
  jobVersion: string;
  jobId: string;
  planId: RecoveryPlanId;
  caseId: RevenueCaseId;
  merchantId: string;
  correlationId: CorrelationId;
  planIdempotencyKey: IdempotencyKey;
  requestedAt: Date;
  attempt: number;
}

export interface RetryRecoveryPlanJob extends RecoveryPlanExecutionJob {
  previousFailureReason?: string;
}

export interface RecoveryWorkflowQueue {
  enqueueApprovedPlan(input: RecoveryPlanExecutionJob): Promise<EnqueueResult>;
  scheduleRetry(input: RetryRecoveryPlanJob): Promise<EnqueueResult>;
  getJobStatus(jobId: string): Promise<QueueJobStatus>;
  shutdown(): Promise<void>;
}
