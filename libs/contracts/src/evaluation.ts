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
