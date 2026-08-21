import { EvaluationMetrics } from './calculator.js';

export class IntegrityAssertions {
  static assertValid(metrics: EvaluationMetrics): void {
    const totalAtRisk = BigInt(metrics.totalAtRiskMinor);
    const systemRecovered = BigInt(metrics.systemRecoveredMinor);

    if (systemRecovered > totalAtRisk) {
      throw new Error('INTEGRITY FAILURE: systemRecovered must never exceed totalAtRisk.');
    }

    if (metrics.falseInterventionCount > metrics.interventionsAttempted) {
      throw new Error('INTEGRITY FAILURE: falseInterventionCount cannot exceed interventionsAttempted.');
    }

    if (metrics.interventionsSucceeded > metrics.interventionsAttempted) {
      throw new Error('INTEGRITY FAILURE: interventionsSucceeded cannot exceed interventionsAttempted.');
    }

    // "no duplicate money recovery" - implied by systemRecovered <= totalAtRisk, but 
    // real assertion would check per-case to ensure case.recoveredAmount <= case.amountAtRisk.
    // For now we do global check.
  }
}
