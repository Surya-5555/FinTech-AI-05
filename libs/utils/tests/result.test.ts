import { expect, test } from 'vitest';
import { success, failure } from '../src/result.js';

test('success result', () => {
  const r = success('ok');
  expect(r.success).toBe(true);
  if (r.success) {
    expect(r.value).toBe('ok');
  }
});

test('failure result', () => {
  const r = failure('err');
  expect(r.success).toBe(false);
  if (!r.success) {
    expect(r.error).toBe('err');
  }
});
