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
