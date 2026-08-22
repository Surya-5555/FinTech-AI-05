import { generateStableHash } from '@rr/utils';
import { IdempotencyKey } from '@rr/contracts';
import { InvalidIdempotencyInputError } from './errors';

export function generateEventIngestionKey(eventId: string, merchantId: string): IdempotencyKey {
  if (!eventId || !merchantId) throw new InvalidIdempotencyInputError('Missing required inputs');
  return generateStableHash(`event:${merchantId}:${eventId}`) as IdempotencyKey;
}

export function generateRecoveryPlanKey(caseId: string, attemptCount: number): IdempotencyKey {
  if (!caseId) throw new InvalidIdempotencyInputError('Missing caseId');
  return generateStableHash(`plan:${caseId}:${attemptCount}`) as IdempotencyKey;
}

export function generateInterventionExecutionKey(planId: string, attemptCount: number): IdempotencyKey {
  if (!planId) throw new InvalidIdempotencyInputError('Missing planId');
  return generateStableHash(`execution:${planId}:${attemptCount}`) as IdempotencyKey;
}
