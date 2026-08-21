import { expect, test } from 'vitest';
import { canTransition, assertTransition, transitionRevenueCase, isTerminal } from '../src/state-machine.js';
import { InvalidStateTransitionError } from '../src/errors.js';
import { RevenueCaseState, RecoveryCase } from '@rr/contracts';
import { createMoney } from '../src/money-helpers.js';

test('isTerminal', () => {
  expect(isTerminal(RevenueCaseState.RECOVERED)).toBe(true);
  expect(isTerminal(RevenueCaseState.DETECTED)).toBe(false);
});

test('canTransition', () => {
  expect(canTransition(RevenueCaseState.EXECUTING, RevenueCaseState.RECOVERED)).toBe(true);
  expect(canTransition(RevenueCaseState.RECOVERED, RevenueCaseState.DETECTED)).toBe(false);
});

test('transitionRevenueCase', () => {
  const rc: RecoveryCase = {
    caseId: 'c1' as any,
    sourceEventId: 'e1' as any,
    merchantId: 'm1' as any,
    customerId: 'cust1' as any,
    amountAtRisk: createMoney(100n, 'INR'),
    state: RevenueCaseState.QUEUED,
    attemptCount: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    version: 1,
    correlationId: 'cor1' as any,
  };

  const now = new Date('2026-01-02T00:00:00Z');
  const next = transitionRevenueCase(rc, RevenueCaseState.EXECUTING, now);
  
  expect(next.state).toBe(RevenueCaseState.EXECUTING);
  expect(next.version).toBe(2);
  expect(next.updatedAt).toBe(now);

  expect(() => transitionRevenueCase(rc, RevenueCaseState.RECOVERED, now)).toThrow(InvalidStateTransitionError);
});
