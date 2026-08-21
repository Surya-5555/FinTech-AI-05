import { expect, test } from 'vitest';
import { validateRecoveryPlan } from '../src/recovery-guard.js';
import { RecoveryPlan, RecoveryCase, RevenueCaseState, InterventionType, ConsentStatus, RecoveryPolicy } from '@rr/contracts';

test('validateRecoveryPlan - case mismatch', () => {
  const plan = { caseId: 'c1' as any, interventionType: InterventionType.PAYMENT_RETRY } as RecoveryPlan;
  const rc = { caseId: 'c2' as any, state: RevenueCaseState.PLANNED } as RecoveryCase;
  const policy = {} as RecoveryPolicy;
  
  const r = validateRecoveryPlan(plan, rc, policy, ConsentStatus.GRANTED);
  expect(r.approved).toBe(false);
  expect(r.reasonCodes).toContain('PLAN_CASE_MISMATCH');
});

test('validateRecoveryPlan - not planned', () => {
  const plan = { caseId: 'c1' as any, interventionType: InterventionType.PAYMENT_RETRY } as RecoveryPlan;
  const rc = { caseId: 'c1' as any, state: RevenueCaseState.QUEUED } as RecoveryCase;
  const policy = {} as RecoveryPolicy;
  
  const r = validateRecoveryPlan(plan, rc, policy, ConsentStatus.GRANTED);
  expect(r.approved).toBe(false);
  expect(r.reasonCodes).toContain('CASE_NOT_IN_PLANNED_STATE');
});
