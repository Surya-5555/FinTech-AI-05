import { expect, test } from 'vitest';
import { ConcurrencyConflictError } from '../src/errors/index';

test('ConcurrencyConflictError instantiates correctly', () => {
  const err = new ConcurrencyConflictError('conflict');
  expect(err.name).toBe('ConcurrencyConflictError');
});
