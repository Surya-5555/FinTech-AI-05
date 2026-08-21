import { StrategyResult } from '../baselines/strategy.js';
import { EvaluationCase } from '../dataset/schemas.js';

export interface EvaluationMetrics {
  // Money
  totalAtRiskMinor: string;
  naturallyRecoveredMinor: string; // From Baseline 0
  baseline1RecoveredMinor: string;
  systemRecoveredMinor: string;
  incrementalRecoveredVsBaseline0: string;
  incrementalRecoveredVsBaseline1: string;
  recoveryRate: number; // percentage
  
  // Interventions
  interventionsAttempted: number;
  interventionsSucceeded: number;
  interventionPrecision: number; // percentage
  falseInterventionCount: number;
  falseInterventionRate: number;
  
  // Safety / Policy
  policyBlockCount: number;
  escalationCount: number;
  escalationRate: number;
  stoppedCaseCount: number;
  stoppedCaseRate: number;
  unsafeActionPreventedCount: number;
  staleActionPreventedCount: number;
  consentBlockCount: number;
  idempotentReplayCount: number;

  // Reliability
  providerTimeoutCount: number;
  providerRetryCount: number;
  providerFinalFailureCount: number;
  workflowFailures: number;

  // AI
  aiDraftRequests: number;
  aiFallbackCount: number;
}

export class MetricsCalculator {
  static compute(
    cases: EvaluationCase[],
    baseline0Results: StrategyResult[],
    baseline1Results: StrategyResult[],
    sutResults: StrategyResult[]
  ): EvaluationMetrics {
    
    // Total At Risk
    let totalAtRisk = 0n;
    for (const c of cases) {
      totalAtRisk += BigInt(c.sourceEvent.amountMinor);
    }

    // Money Recovered (BigInt safe)
    let naturallyRecovered = 0n;
    let b1Recovered = 0n;
    let sysRecovered = 0n;

    for (const r of baseline0Results) naturallyRecovered += BigInt(r.recoveredAmountMinor);
    for (const r of baseline1Results) b1Recovered += BigInt(r.recoveredAmountMinor);
    for (const r of sutResults) sysRecovered += BigInt(r.recoveredAmountMinor);

    const incrementalVsB0 = sysRecovered - naturallyRecovered;
    const incrementalVsB1 = sysRecovered - b1Recovered;

    const recoveryRate = totalAtRisk > 0n ? Number(sysRecovered) / Number(totalAtRisk) : 0;

    // Aggregate SUT interventions
    let interventionsAttempted = 0;
    let interventionsSucceeded = 0;
    let falseInterventionCount = 0;
    let policyBlockCount = 0;
    let escalationCount = 0;
    let stoppedCaseCount = 0;
    let unsafeActionPreventedCount = 0;
    let staleActionPreventedCount = 0;
    let consentBlockCount = 0;
    let idempotentReplayCount = 0;
    let providerTimeoutCount = 0;
    let providerRetryCount = 0;
    let providerFinalFailureCount = 0;
    let workflowFailures = 0;
    let aiRequests = 0;
    let aiFallbacks = 0;

    for (const r of sutResults) {
      interventionsAttempted += r.interventionsAttempted;
      interventionsSucceeded += r.interventionsSucceeded;
      falseInterventionCount += r.falseInterventionCount;
      policyBlockCount += r.policyBlocks;
      escalationCount += r.escalations;
      stoppedCaseCount += r.stops;
      unsafeActionPreventedCount += r.unsafeActionsPrevented;
      staleActionPreventedCount += r.staleActionsPrevented;
      consentBlockCount += r.consentBlocks;
      idempotentReplayCount += r.idempotentReplays;
      providerTimeoutCount += r.providerTimeouts;
      providerRetryCount += r.providerRetries;
      providerFinalFailureCount += r.providerFinalFailures;
      workflowFailures += r.workflowFailures;
      aiRequests += r.aiRequests;
      aiFallbacks += r.aiFallbacks;
    }

    const interventionPrecision = interventionsAttempted > 0 ? interventionsSucceeded / interventionsAttempted : 0;
    const falseInterventionRate = interventionsAttempted > 0 ? falseInterventionCount / interventionsAttempted : 0;
    const totalCases = cases.length;
    const escalationRate = totalCases > 0 ? escalationCount / totalCases : 0;
    const stoppedCaseRate = totalCases > 0 ? stoppedCaseCount / totalCases : 0;

    return {
      totalAtRiskMinor: totalAtRisk.toString(),
      naturallyRecoveredMinor: naturallyRecovered.toString(),
      baseline1RecoveredMinor: b1Recovered.toString(),
      systemRecoveredMinor: sysRecovered.toString(),
      incrementalRecoveredVsBaseline0: incrementalVsB0.toString(),
      incrementalRecoveredVsBaseline1: incrementalVsB1.toString(),
      recoveryRate,
      interventionsAttempted,
      interventionsSucceeded,
      interventionPrecision,
      falseInterventionCount,
      falseInterventionRate,
      policyBlockCount,
      escalationCount,
      escalationRate,
      stoppedCaseCount,
      stoppedCaseRate,
      unsafeActionPreventedCount,
      staleActionPreventedCount,
      consentBlockCount,
      idempotentReplayCount,
      providerTimeoutCount,
      providerRetryCount,
      providerFinalFailureCount,
      workflowFailures,
      aiDraftRequests: aiRequests,
      aiFallbackCount: aiFallbacks
    };
  }
}
