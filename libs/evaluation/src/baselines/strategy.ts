import { EvaluationCase } from '../dataset/schemas.js';

export interface StrategyResult {
  interventionsAttempted: number;
  interventionsSucceeded: number;
  falseInterventionCount: number;
  recoveredAmountMinor: string;
  isRecovered: boolean;
  policyBlocks: number;
  escalations: number;
  stops: number;
  unsafeActionsPrevented: number;
  staleActionsPrevented: number;
  consentBlocks: number;
  idempotentReplays: number;
  providerTimeouts: number;
  providerRetries: number;
  providerFinalFailures: number;
  workflowFailures: number;
  aiRequests: number;
  aiFallbacks: number;
}

export interface EvaluationStrategy {
  name: string;
  evaluate(evaluationCase: EvaluationCase): Promise<StrategyResult>;
}
