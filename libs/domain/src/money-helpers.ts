import { Money } from '@rr/contracts';
import { CurrencyMismatchError, InvalidMoneyError } from './errors.js';

export function createMoney(amountMinor: bigint, currency: string): Money {
  if (amountMinor < 0n) {
    throw new InvalidMoneyError('Money cannot be negative.');
  }
  return { amountMinor, currency };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError('Currencies must match.');
  }
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError('Currencies must match.');
  }
  const result = a.amountMinor - b.amountMinor;
  if (result < 0n) {
    throw new InvalidMoneyError('Money cannot be negative.');
  }
  return { amountMinor: result, currency: a.currency };
}

export function compareMoney(a: Money, b: Money): number {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError('Currencies must match.');
  }
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}
