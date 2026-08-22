import { expect, test } from 'vitest';
import { getUtcNow } from '../src/date';

test('getUtcNow returns a Date', () => {
  const d = getUtcNow();
  expect(d).toBeInstanceOf(Date);
});
