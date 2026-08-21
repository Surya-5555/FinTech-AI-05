export interface OutboxEventRecord {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  idempotencyKey: string;
  attempts: number;
  availableAt: Date;
}

export interface OutboxRepository {
  claimPendingOutboxEvents(batchSize: number, lockDurationMs: number): Promise<OutboxEventRecord[]>;
  markOutboxPublished(eventId: string): Promise<void>;
  rescheduleOutboxEvent(eventId: string, nextAvailableAt: Date, errorMsg: string): Promise<void>;
  markOutboxFailed(eventId: string, errorMsg: string): Promise<void>;
}
