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
