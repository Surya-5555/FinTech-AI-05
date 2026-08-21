import os
from pathlib import Path

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

# ----------------- CONTRACTS -----------------

identifiers = """
export type MerchantId = string & { readonly __brand: 'MerchantId' };
export type CustomerId = string & { readonly __brand: 'CustomerId' };
export type EventId = string & { readonly __brand: 'EventId' };
export type RevenueCaseId = string & { readonly __brand: 'RevenueCaseId' };
export type RecoveryPlanId = string & { readonly __brand: 'RecoveryPlanId' };
export type InterventionId = string & { readonly __brand: 'InterventionId' };
export type EvaluationRunId = string & { readonly __brand: 'EvaluationRunId' };
export type AuditLogId = string & { readonly __brand: 'AuditLogId' };
export type IdempotencyKey = string & { readonly __brand: 'IdempotencyKey' };
export type CorrelationId = string & { readonly __brand: 'CorrelationId' };
"""

money = """
export interface Money {
  amountMinor: bigint;
  currency: string;
}
"""

events = """
import { EventId, MerchantId, CustomerId, CorrelationId } from './identifiers.js';
import { Money } from './money.js';

export enum EventType {
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CHECKOUT_ABANDONED = 'CHECKOUT_ABANDONED',
  SUBSCRIPTION_FAILED = 'SUBSCRIPTION_FAILED',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  PAYMENT_RECOVERED = 'PAYMENT_RECOVERED',
  PAYMENT_STATUS_UPDATED = 'PAYMENT_STATUS_UPDATED',
}

export enum PaymentFailureReason {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  BANK_TIMEOUT = 'BANK_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  PAYMENT_METHOD_DECLINED = 'PAYMENT_METHOD_DECLINED',
  MANDATE_FAILED = 'MANDATE_FAILED',
  UNKNOWN = 'UNKNOWN',
}

export interface RevenueEvent {
  eventId: EventId;
  externalEventId: string;
  merchantId: MerchantId;
  customerId: CustomerId;
  eventType: EventType;
  occurredAt: Date;
  amount: Money;
  failureReason?: PaymentFailureReason;
  correlationId: CorrelationId;
  rawPayloadVersion: string;
  metadata: Record<string, string | number | boolean>;
}
"""

case_ts = """
import { RevenueCaseId, EventId, MerchantId, CustomerId, CorrelationId } from './identifiers.js';
import { Money } from './money.js';

export enum RevenueCaseState {
  DETECTED = 'DETECTED',
  QUALIFIED = 'QUALIFIED',
  DIAGNOSED = 'DIAGNOSED',
  PLANNED = 'PLANNED',
  POLICY_CHECKED = 'POLICY_CHECKED',
  QUEUED = 'QUEUED',
  EXECUTING = 'EXECUTING',
  RECOVERED = 'RECOVERED',
  FAILED = 'FAILED',
  RETRYABLE = 'RETRYABLE',
  ESCALATED = 'ESCALATED',
  STOPPED = 'STOPPED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
}

export interface RecoveryCase {
  caseId: RevenueCaseId;
  sourceEventId: EventId;
  merchantId: MerchantId;
  customerId: CustomerId;
  amountAtRisk: Money;
  state: RevenueCaseState;
  attemptCount: number;
  recoveryScore?: number;
  rootCause?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  correlationId: CorrelationId;
}
"""

plan = """
import { RecoveryPlanId, RevenueCaseId, IdempotencyKey } from './identifiers.js';

export enum InterventionType {
  PAYMENT_RETRY = 'PAYMENT_RETRY',
  PAYMENT_LINK = 'PAYMENT_LINK',
  EMAIL_REMINDER = 'EMAIL_REMINDER',
  SMS_REMINDER = 'SMS_REMINDER',
  VOICE_REMINDER = 'VOICE_REMINDER',
  HUMAN_ESCALATION = 'HUMAN_ESCALATION',
  NO_ACTION = 'NO_ACTION',
}

export interface RecoveryPlan {
  planId: RecoveryPlanId;
  caseId: RevenueCaseId;
  interventionType: InterventionType;
  plannedAt: Date;
  reasonCodes: string[];
  policyVersion: string;
  requiresHumanApproval: boolean;
  idempotencyKey: IdempotencyKey;
  parameters: Record<string, string | number | boolean>;
}
"""

intervention = """
import { InterventionId, CorrelationId } from './identifiers.js';
import { Money } from './money.js';

export enum InterventionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTING = 'EXECUTING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  RETRY_SCHEDULED = 'RETRY_SCHEDULED',
  ESCALATED = 'ESCALATED',
  STOPPED = 'STOPPED',
}

export interface InterventionOutcome {
  interventionId: InterventionId;
  status: InterventionStatus;
  executedAt: Date;
  recoveredAmount?: Money;
  externalReference?: string;
  failureCode?: string;
  retryAfter?: Date;
  correlationId: CorrelationId;
}
"""

policy = """
import { InterventionType } from './plan.js';

export enum ConsentStatus {
  GRANTED = 'GRANTED',
  DENIED = 'DENIED',
  UNKNOWN = 'UNKNOWN',
  EXPIRED = 'EXPIRED',
}

export interface RecoveryPolicy {
  policyVersion: string;
  maxAttemptsPerCase: number;
  maxMessagesPerCustomerWindow: number;
  messageWindowHours: number;
  maxRetryAmountMinor: bigint;
  minimumRecoveryScore: number;
  lowConfidenceEscalationThreshold: number;
  allowedInterventionTypes: InterventionType[];
  requiredConsentChannels: string[];
}

export interface PolicyDecision {
  approved: boolean;
  reasonCodes: string[];
  requiresHumanApproval: boolean;
  stopCase: boolean;
}
"""

audit = """
import { AuditLogId, CorrelationId } from './identifiers.js';

export enum AuditActorType {
  SYSTEM = 'SYSTEM',
  POLICY_ENGINE = 'POLICY_ENGINE',
  HUMAN_OPERATOR = 'HUMAN_OPERATOR',
  EVALUATION_RUNNER = 'EVALUATION_RUNNER',
}

export enum AuditAction {
  EVENT_INGESTED = 'EVENT_INGESTED',
  CASE_CREATED = 'CASE_CREATED',
  STATE_TRANSITIONED = 'STATE_TRANSITIONED',
  PLAN_PROPOSED = 'PLAN_PROPOSED',
  POLICY_APPROVED = 'POLICY_APPROVED',
  POLICY_REJECTED = 'POLICY_REJECTED',
  INTERVENTION_ENQUEUED = 'INTERVENTION_ENQUEUED',
  INTERVENTION_EXECUTED = 'INTERVENTION_EXECUTED',
  INTERVENTION_FAILED = 'INTERVENTION_FAILED',
  CASE_ESCALATED = 'CASE_ESCALATED',
  CASE_STOPPED = 'CASE_STOPPED',
  EVALUATION_COMPLETED = 'EVALUATION_COMPLETED',
}

export interface AuditLog {
  auditLogId: AuditLogId;
  timestamp: Date;
  actorType: AuditActorType;
  action: AuditAction;
  entityType: string;
  entityId: string;
  correlationId: CorrelationId;
  previousState?: string;
  nextState?: string;
  metadata: Record<string, string | number | boolean>;
}
"""

evaluation = """
import { EvaluationRunId } from './identifiers.js';
import { Money } from './money.js';

export interface EvaluationRun {
  evaluationRunId: EvaluationRunId;
  datasetVersion: string;
  systemVersion: string;
  policyVersion: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
}

export interface EvaluationMetrics {
  totalCases: number;
  totalAtRisk: Money;
  baselineRecovered: Money;
  systemRecovered: Money;
  incrementalRecovered: Money;
  recoveryRate: number;
  interventionPrecision: number;
  falseInterventionCount: number;
  escalationCount: number;
  stoppedCaseCount: number;
  averageAttemptsPerCase: number;
  medianRecoveryLatencyMs: number;
  totalInferenceCostMinor?: bigint;
}
"""

contracts_index = """
export * from './identifiers.js';
export * from './money.js';
export * from './events.js';
export * from './case.js';
export * from './plan.js';
export * from './intervention.js';
export * from './policy.js';
export * from './audit.js';
export * from './evaluation.js';
"""

# ----------------- UTILS -----------------

hash_ts = """
import * as crypto from 'crypto';

export function generateStableHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
"""

date_ts = """
export function getUtcNow(): Date {
  return new Date();
}
"""

result_ts = """
export type Result<T, E> = 
  | { success: true; value: T }
  | { success: false; error: E };

export function success<T, E>(value: T): Result<T, E> {
  return { success: true, value };
}

export function failure<T, E>(error: E): Result<T, E> {
  return { success: false, error };
}
"""

utils_index = """
export * from './hash.js';
export * from './date.js';
export * from './result.js';
"""

utils_test_result = """
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
"""

utils_test_hash = """
import { expect, test } from 'vitest';
import { generateStableHash } from '../src/hash.js';

test('generateStableHash is deterministic', () => {
  expect(generateStableHash('foo')).toBe(generateStableHash('foo'));
  expect(generateStableHash('foo')).not.toBe(generateStableHash('bar'));
});
"""

utils_test_date = """
import { expect, test } from 'vitest';
import { getUtcNow } from '../src/date.js';

test('getUtcNow returns a Date', () => {
  const d = getUtcNow();
  expect(d).toBeInstanceOf(Date);
});
"""

# ----------------- DOMAIN -----------------

errors_ts = """
export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateTransitionError';
  }
}

export class PolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

export class CurrencyMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurrencyMismatchError';
  }
}

export class InvalidMoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoneyError';
  }
}

export class InvalidIdempotencyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidIdempotencyInputError';
  }
}
"""

money_helpers_ts = """
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
"""

state_machine_ts = """
import { RecoveryCase, RevenueCaseState } from '@rr/contracts';
import { InvalidStateTransitionError } from './errors.js';

export function isTerminal(state: RevenueCaseState): boolean {
  return [
    RevenueCaseState.RECOVERED,
    RevenueCaseState.FAILED,
    RevenueCaseState.STOPPED,
    RevenueCaseState.EXPIRED,
    RevenueCaseState.REJECTED
  ].includes(state);
}

const validTransitions: Record<RevenueCaseState, Set<RevenueCaseState>> = {
  [RevenueCaseState.DETECTED]: new Set([RevenueCaseState.QUALIFIED, RevenueCaseState.REJECTED]),
  [RevenueCaseState.QUALIFIED]: new Set([RevenueCaseState.DIAGNOSED, RevenueCaseState.REJECTED]),
  [RevenueCaseState.DIAGNOSED]: new Set([RevenueCaseState.PLANNED, RevenueCaseState.ESCALATED]),
  [RevenueCaseState.PLANNED]: new Set([RevenueCaseState.POLICY_CHECKED, RevenueCaseState.REJECTED]),
  [RevenueCaseState.POLICY_CHECKED]: new Set([RevenueCaseState.QUEUED, RevenueCaseState.REJECTED, RevenueCaseState.STOPPED]),
  [RevenueCaseState.QUEUED]: new Set([RevenueCaseState.EXECUTING, RevenueCaseState.STOPPED]),
  [RevenueCaseState.EXECUTING]: new Set([RevenueCaseState.RECOVERED, RevenueCaseState.FAILED, RevenueCaseState.RETRYABLE, RevenueCaseState.ESCALATED, RevenueCaseState.STOPPED]),
  [RevenueCaseState.RETRYABLE]: new Set([RevenueCaseState.PLANNED, RevenueCaseState.QUEUED, RevenueCaseState.ESCALATED, RevenueCaseState.STOPPED, RevenueCaseState.EXPIRED]),
  [RevenueCaseState.ESCALATED]: new Set([RevenueCaseState.STOPPED, RevenueCaseState.RECOVERED, RevenueCaseState.FAILED]),
  [RevenueCaseState.RECOVERED]: new Set(),
  [RevenueCaseState.FAILED]: new Set(),
  [RevenueCaseState.STOPPED]: new Set(),
  [RevenueCaseState.EXPIRED]: new Set(),
  [RevenueCaseState.REJECTED]: new Set(),
};

export function canTransition(from: RevenueCaseState, to: RevenueCaseState): boolean {
  return validTransitions[from]?.has(to) ?? false;
}

export function assertTransition(from: RevenueCaseState, to: RevenueCaseState): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(`Cannot transition from ${from} to ${to}`);
  }
}

export function transitionRevenueCase(rc: RecoveryCase, nextState: RevenueCaseState, now: Date): RecoveryCase {
  assertTransition(rc.state, nextState);
  return {
    ...rc,
    state: nextState,
    updatedAt: now,
    version: rc.version + 1,
  };
}
"""

idempotency_ts = """
import { generateStableHash } from '@rr/utils';
import { IdempotencyKey } from '@rr/contracts';
import { InvalidIdempotencyInputError } from './errors.js';

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
"""

policy_evaluator_ts = """
import { RecoveryCase, RecoveryPolicy, PolicyDecision, ConsentStatus, InterventionType } from '@rr/contracts';
import { isTerminal } from './state-machine.js';

export interface PolicyInput {
  rc: RecoveryCase;
  policy: RecoveryPolicy;
  interventionType: InterventionType;
  consentStatus: ConsentStatus;
  retryAmountMinor?: bigint;
}

export function evaluateRecoveryPolicy(input: PolicyInput): PolicyDecision {
  const reasons: string[] = [];
  let stopCase = false;
  let approved = true;

  if (isTerminal(input.rc.state)) {
    reasons.push('CASE_ALREADY_TERMINAL');
    approved = false;
    stopCase = true;
  }

  if (input.rc.attemptCount >= input.policy.maxAttemptsPerCase) {
    reasons.push('MAX_ATTEMPTS_EXCEEDED');
    approved = false;
    stopCase = true;
  }

  if (input.rc.recoveryScore !== undefined && input.rc.recoveryScore < input.policy.minimumRecoveryScore) {
    reasons.push('SCORE_TOO_LOW');
    approved = false;
  }

  if (!input.policy.allowedInterventionTypes.includes(input.interventionType)) {
    reasons.push('INTERVENTION_NOT_ALLOWED');
    approved = false;
  }

  if (input.consentStatus === ConsentStatus.DENIED) {
    reasons.push('CONSENT_DENIED');
    approved = false;
    stopCase = true;
  }
  
  if (input.consentStatus === ConsentStatus.UNKNOWN && input.policy.requiredConsentChannels.length > 0) {
    reasons.push('CONSENT_UNKNOWN');
    approved = false;
  }

  if (input.retryAmountMinor !== undefined && input.retryAmountMinor > input.policy.maxRetryAmountMinor) {
    reasons.push('RETRY_AMOUNT_EXCEEDS_MAX');
    approved = false;
  }

  const requiresHumanApproval = (input.rc.recoveryScore !== undefined && input.rc.recoveryScore < input.policy.lowConfidenceEscalationThreshold);
  if (requiresHumanApproval) {
    reasons.push('REQUIRES_HUMAN_APPROVAL');
  }

  return {
    approved,
    reasonCodes: reasons,
    requiresHumanApproval,
    stopCase,
  };
}
"""

recovery_guard_ts = """
import { RecoveryPlan, RecoveryCase, RecoveryPolicy, PolicyDecision, ConsentStatus, RevenueCaseState } from '@rr/contracts';
import { evaluateRecoveryPolicy } from './policy-evaluator.js';

export function validateRecoveryPlan(plan: RecoveryPlan, rc: RecoveryCase, policy: RecoveryPolicy, consent: ConsentStatus): PolicyDecision {
  if (rc.state !== RevenueCaseState.PLANNED) {
    return {
      approved: false,
      reasonCodes: ['CASE_NOT_IN_PLANNED_STATE'],
      requiresHumanApproval: false,
      stopCase: false,
    };
  }

  if (plan.caseId !== rc.caseId) {
    return {
      approved: false,
      reasonCodes: ['PLAN_CASE_MISMATCH'],
      requiresHumanApproval: false,
      stopCase: false,
    };
  }

  return evaluateRecoveryPolicy({
    rc,
    policy,
    interventionType: plan.interventionType,
    consentStatus: consent,
  });
}
"""

domain_index = """
export * from './errors.js';
export * from './money-helpers.js';
export * from './state-machine.js';
export * from './idempotency.js';
export * from './policy-evaluator.js';
export * from './recovery-guard.js';
"""

test_money_ts = """
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
"""

test_state_machine_ts = """
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
"""

test_idempotency_ts = """
import { expect, test } from 'vitest';
import { generateEventIngestionKey, generateRecoveryPlanKey, generateInterventionExecutionKey } from '../src/idempotency.js';
import { InvalidIdempotencyInputError } from '../src/errors.js';

test('generateEventIngestionKey', () => {
  expect(generateEventIngestionKey('e1', 'm1')).toBe(generateEventIngestionKey('e1', 'm1'));
  expect(() => generateEventIngestionKey('', 'm1')).toThrow(InvalidIdempotencyInputError);
});

test('generateRecoveryPlanKey', () => {
  expect(generateRecoveryPlanKey('c1', 1)).toBe(generateRecoveryPlanKey('c1', 1));
  expect(generateRecoveryPlanKey('c1', 1)).not.toBe(generateRecoveryPlanKey('c1', 2));
});
"""

test_policy_ts = """
import { expect, test } from 'vitest';
import { evaluateRecoveryPolicy } from '../src/policy-evaluator.js';
import { RecoveryCase, RevenueCaseState, RecoveryPolicy, ConsentStatus, InterventionType } from '@rr/contracts';

const mockPolicy: RecoveryPolicy = {
  policyVersion: '1.0',
  maxAttemptsPerCase: 3,
  maxMessagesPerCustomerWindow: 1,
  messageWindowHours: 24,
  maxRetryAmountMinor: 10000n,
  minimumRecoveryScore: 50,
  lowConfidenceEscalationThreshold: 70,
  allowedInterventionTypes: [InterventionType.PAYMENT_RETRY, InterventionType.EMAIL_REMINDER],
  requiredConsentChannels: ['email'],
};

const mockRc = {
  state: RevenueCaseState.PLANNED,
  attemptCount: 1,
  recoveryScore: 80,
} as RecoveryCase;

test('evaluateRecoveryPolicy - approved', () => {
  const result = evaluateRecoveryPolicy({
    rc: mockRc,
    policy: mockPolicy,
    interventionType: InterventionType.PAYMENT_RETRY,
    consentStatus: ConsentStatus.GRANTED,
  });
  expect(result.approved).toBe(true);
  expect(result.stopCase).toBe(false);
});

test('evaluateRecoveryPolicy - max attempts', () => {
  const result = evaluateRecoveryPolicy({
    rc: { ...mockRc, attemptCount: 3 } as RecoveryCase,
    policy: mockPolicy,
    interventionType: InterventionType.PAYMENT_RETRY,
    consentStatus: ConsentStatus.GRANTED,
  });
  expect(result.approved).toBe(false);
  expect(result.stopCase).toBe(true);
  expect(result.reasonCodes).toContain('MAX_ATTEMPTS_EXCEEDED');
});

test('evaluateRecoveryPolicy - low score', () => {
  const result = evaluateRecoveryPolicy({
    rc: { ...mockRc, recoveryScore: 40 } as RecoveryCase,
    policy: mockPolicy,
    interventionType: InterventionType.PAYMENT_RETRY,
    consentStatus: ConsentStatus.GRANTED,
  });
  expect(result.approved).toBe(false);
  expect(result.reasonCodes).toContain('SCORE_TOO_LOW');
});

test('evaluateRecoveryPolicy - denied consent', () => {
  const result = evaluateRecoveryPolicy({
    rc: mockRc,
    policy: mockPolicy,
    interventionType: InterventionType.EMAIL_REMINDER,
    consentStatus: ConsentStatus.DENIED,
  });
  expect(result.approved).toBe(false);
  expect(result.stopCase).toBe(true);
  expect(result.reasonCodes).toContain('CONSENT_DENIED');
});

test('evaluateRecoveryPolicy - intervention not allowed', () => {
  const result = evaluateRecoveryPolicy({
    rc: mockRc,
    policy: mockPolicy,
    interventionType: InterventionType.SMS_REMINDER,
    consentStatus: ConsentStatus.GRANTED,
  });
  expect(result.approved).toBe(false);
  expect(result.reasonCodes).toContain('INTERVENTION_NOT_ALLOWED');
});

test('evaluateRecoveryPolicy - retry amount too high', () => {
  const result = evaluateRecoveryPolicy({
    rc: mockRc,
    policy: mockPolicy,
    interventionType: InterventionType.PAYMENT_RETRY,
    consentStatus: ConsentStatus.GRANTED,
    retryAmountMinor: 20000n,
  });
  expect(result.approved).toBe(false);
  expect(result.reasonCodes).toContain('RETRY_AMOUNT_EXCEEDS_MAX');
});
"""

test_guard_ts = """
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
"""

domain_model_md = """# Domain Model

## Bounded Contexts
- Revenue Cases
- Ingestion
- Planning & Policy
- Evaluation

## Key Entities
- `RecoveryCase`: Tracks the lifecycle of revenue at risk.
- `RevenueEvent`: Incoming trigger.
- `RecoveryPlan`: Proposed intervention.
- `InterventionOutcome`: Result of execution.
- `PolicyDecision`: Deterministic outcome of a policy check.

## Invariants
- AI CANNOT change domain state.
- AI CANNOT invoke money actions directly.
- All money uses bigint minor units (`Money`).
- Idempotency keys are deterministic.
"""

state_machine_md = """# State Machine

```mermaid
stateDiagram-v2
    [*] --> DETECTED
    DETECTED --> QUALIFIED
    DETECTED --> REJECTED
    QUALIFIED --> DIAGNOSED
    QUALIFIED --> REJECTED
    DIAGNOSED --> PLANNED
    DIAGNOSED --> ESCALATED
    PLANNED --> POLICY_CHECKED
    PLANNED --> REJECTED
    POLICY_CHECKED --> QUEUED
    POLICY_CHECKED --> REJECTED
    POLICY_CHECKED --> STOPPED
    QUEUED --> EXECUTING
    QUEUED --> STOPPED
    EXECUTING --> RECOVERED
    EXECUTING --> FAILED
    EXECUTING --> RETRYABLE
    EXECUTING --> ESCALATED
    EXECUTING --> STOPPED
    RETRYABLE --> PLANNED
    RETRYABLE --> QUEUED
    RETRYABLE --> ESCALATED
    RETRYABLE --> STOPPED
    RETRYABLE --> EXPIRED
    ESCALATED --> STOPPED
    ESCALATED --> RECOVERED
    ESCALATED --> FAILED
```

Terminal States: RECOVERED, FAILED, STOPPED, EXPIRED, REJECTED.
"""

adr_007 = """# ADR 007: Domain First Foundation

## Context
We need a safe, robust foundation for fintech operations that isolates AI logic from financial state changes.

## Decision
- Implement pure domain logic before any external I/O.
- Money uses bigint minor units to prevent float precision issues.
- State transitions are heavily guarded to enforce invariants.
- Policy decisions are 100% deterministic and synchronously executable without side effects.
"""

write_file('libs/contracts/src/identifiers.ts', identifiers)
write_file('libs/contracts/src/money.ts', money)
write_file('libs/contracts/src/events.ts', events)
write_file('libs/contracts/src/case.ts', case_ts)
write_file('libs/contracts/src/plan.ts', plan)
write_file('libs/contracts/src/intervention.ts', intervention)
write_file('libs/contracts/src/policy.ts', policy)
write_file('libs/contracts/src/audit.ts', audit)
write_file('libs/contracts/src/evaluation.ts', evaluation)
write_file('libs/contracts/src/index.ts', contracts_index)

write_file('libs/utils/src/hash.ts', hash_ts)
write_file('libs/utils/src/date.ts', date_ts)
write_file('libs/utils/src/result.ts', result_ts)
write_file('libs/utils/src/index.ts', utils_index)
write_file('libs/utils/tests/hash.test.ts', utils_test_hash)
write_file('libs/utils/tests/date.test.ts', utils_test_date)
write_file('libs/utils/tests/result.test.ts', utils_test_result)

write_file('libs/domain/src/errors.ts', errors_ts)
write_file('libs/domain/src/money-helpers.ts', money_helpers_ts)
write_file('libs/domain/src/state-machine.ts', state_machine_ts)
write_file('libs/domain/src/idempotency.ts', idempotency_ts)
write_file('libs/domain/src/policy-evaluator.ts', policy_evaluator_ts)
write_file('libs/domain/src/recovery-guard.ts', recovery_guard_ts)
write_file('libs/domain/src/index.ts', domain_index)
write_file('libs/domain/tests/money-helpers.test.ts', test_money_ts)
write_file('libs/domain/tests/state-machine.test.ts', test_state_machine_ts)
write_file('libs/domain/tests/idempotency.test.ts', test_idempotency_ts)
write_file('libs/domain/tests/policy-evaluator.test.ts', test_policy_ts)
write_file('libs/domain/tests/recovery-guard.test.ts', test_guard_ts)

write_file('docs/architecture/DOMAIN_MODEL.md', domain_model_md)
write_file('docs/architecture/STATE_MACHINE.md', state_machine_md)
write_file('docs/decisions/ADR-007-domain-first-foundation.md', adr_007)

import json
# Update package.jsons to include vitest dependency in domain and utils if needed, but we can just use the root.
# We also need to make sure `@rr/contracts` is linked in `libs/domain/package.json`
with open('libs/domain/package.json', 'r') as f: pkg = json.load(f)
pkg['dependencies'] = { "@rr/contracts": "workspace:*", "@rr/utils": "workspace:*" }
with open('libs/domain/package.json', 'w') as f: json.dump(pkg, f, indent=2)

print("Domain scaffold complete.")
