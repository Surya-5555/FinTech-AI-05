import { expect, test } from 'vitest';
import { generateEventIngestionKey, generateRecoveryPlanKey, generateInterventionExecutionKey } from '../src/idempotency';
import { InvalidIdempotencyInputError } from '../src/errors';

test('generateEventIngestionKey', () => {
  expect(generateEventIngestionKey('e1', 'm1')).toBe(generateEventIngestionKey('e1', 'm1'));
  expect(() => generateEventIngestionKey('', 'm1')).toThrow(InvalidIdempotencyInputError);
});

test('generateRecoveryPlanKey', () => {
  expect(generateRecoveryPlanKey('c1', 1)).toBe(generateRecoveryPlanKey('c1', 1));
  expect(generateRecoveryPlanKey('c1', 1)).not.toBe(generateRecoveryPlanKey('c1', 2));
});
