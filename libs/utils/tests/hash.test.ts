import { expect, test } from 'vitest';
import { generateStableHash } from '../src/hash.js';

test('generateStableHash is deterministic', () => {
  expect(generateStableHash('foo')).toBe(generateStableHash('foo'));
  expect(generateStableHash('foo')).not.toBe(generateStableHash('bar'));
});
