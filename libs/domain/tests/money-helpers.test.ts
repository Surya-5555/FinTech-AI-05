import { expect, test } from 'vitest';
import { createMoney, addMoney, subtractMoney, compareMoney } from '../src/money-helpers.js';
import { CurrencyMismatchError, InvalidMoneyError } from '../src/errors.js';

test('createMoney', () => {
  const m = createMoney(100n, 'INR');
  expect(m.amountMinor).toBe(100n);
  expect(m.currency).toBe('INR');
  expect(() => createMoney(-10n, 'INR')).toThrow(InvalidMoneyError);
});

test('addMoney', () => {
  const m1 = createMoney(100n, 'INR');
  const m2 = createMoney(50n, 'INR');
  const r = addMoney(m1, m2);
  expect(r.amountMinor).toBe(150n);
  expect(() => addMoney(m1, createMoney(10n, 'USD'))).toThrow(CurrencyMismatchError);
});

test('subtractMoney', () => {
  const m1 = createMoney(100n, 'INR');
  const m2 = createMoney(50n, 'INR');
  const r = subtractMoney(m1, m2);
  expect(r.amountMinor).toBe(50n);
  expect(() => subtractMoney(m2, m1)).toThrow(InvalidMoneyError);
});

test('compareMoney', () => {
  const m1 = createMoney(100n, 'INR');
  const m2 = createMoney(50n, 'INR');
  const m3 = createMoney(100n, 'INR');
  expect(compareMoney(m1, m2)).toBe(1);
  expect(compareMoney(m2, m1)).toBe(-1);
  expect(compareMoney(m1, m3)).toBe(0);
});
