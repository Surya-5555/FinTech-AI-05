import { StrategyResult } from '../baselines/strategy';
import { EvaluationCase } from '../dataset/schemas';

const COST_PER_INTERVENTION_MINOR = 50n; // ₹0.50 per SMS/Email
const FRAUD_CHARGEBACK_PENALTY_MINOR = 150000n; // ₹1,500 per fraud chargeback

export interface RoiResult {
  totalCostMinor: string;
  netRoiMinor: string;
  chargebackCount: number;
}

export class RoiCalculator {
  static computeNetRoi(results: StrategyResult[], cases: EvaluationCase[]): RoiResult {
    let totalCost = 0n;
    let grossRecovered = 0n;
    let chargebackCount = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const c = cases[i];
      
      if (!result || !c) continue;

      grossRecovered += BigInt(result.recoveredAmountMinor);
      
      // Cost of interventions
      totalCost += BigInt(result.interventionsAttempted) * COST_PER_INTERVENTION_MINOR;

      // Penalty for retrying a suspected fraud case
      if (c.scenarioId === 'SCN_FRAUD_SUSPECTED' && result.interventionsAttempted > 0) {
        totalCost += FRAUD_CHARGEBACK_PENALTY_MINOR;
        chargebackCount++;
      }
    }

    const netRoi = grossRecovered - totalCost;

    return {
      totalCostMinor: totalCost.toString(),
      netRoiMinor: netRoi.toString(),
      chargebackCount
    };
  }
}
