import * as fs from 'fs';
import * as path from 'path';
import { EvaluationManifest } from '../dataset/schemas';
import { EvaluationMetrics } from '../metrics/calculator';

export function generateReport(outPath: string, manifest: EvaluationManifest, metrics: EvaluationMetrics, rawData: any) {
  // Save JSON summary
  fs.writeFileSync(path.join(outPath, 'summary.json'), JSON.stringify(metrics, null, 2));

  // Save Markdown Summary
  const md = `# Evaluation Summary

## Run Configuration
- **Dataset Version**: ${manifest.datasetVersion}
- **Dataset Checksum**: ${manifest.checksum}
- **Held-Out Case Count**: ${manifest.caseCount}

## Money Metrics
- **Total At Risk**: ${metrics.totalAtRiskMinor}
- **Naturally Recovered**: ${metrics.naturallyRecoveredMinor}
- **Baseline 1 Recovered**: ${metrics.baseline1RecoveredMinor}
- **System Recovered**: ${metrics.systemRecoveredMinor}
- **Incremental vs Baseline 0**: ${metrics.incrementalRecoveredVsBaseline0}
- **Incremental vs Baseline 1**: ${metrics.incrementalRecoveredVsBaseline1}
- **Recovery Rate**: ${(metrics.recoveryRate * 100).toFixed(2)}%

## Net ROI (Value minus Costs & Penalties)
- **Baseline 1 Gross Recovered**: ${metrics.baseline1RecoveredMinor}
- **Baseline 1 Total Cost**: ${metrics.baseline1CostMinor} (including ${metrics.baseline1Chargebacks} fraud chargebacks)
- **Baseline 1 Net ROI**: ${metrics.baseline1NetRoiMinor}
- **System Gross Recovered**: ${metrics.systemRecoveredMinor}
- **System Total Cost**: ${metrics.systemCostMinor} (including ${metrics.systemChargebacks} fraud chargebacks)
- **System Net ROI**: ${metrics.systemNetRoiMinor}
- **Incremental Risk-Adjusted Value (System vs B1)**: ${metrics.incrementalNetRoiVsBaseline1}


## Intervention Metrics
- **Attempted**: ${metrics.interventionsAttempted}
- **Succeeded**: ${metrics.interventionsSucceeded}
- **Precision**: ${(metrics.interventionPrecision * 100).toFixed(2)}%
- **Failed**: ${metrics.failedInterventions} (${(metrics.failedInterventionRate * 100).toFixed(2)}%)
- **False Interventions**: ${metrics.falseInterventionCount} (${(metrics.falseInterventionRate * 100).toFixed(2)}%)
- **Avg Attempts Per Case**: ${metrics.averageAttemptsPerCase.toFixed(2)}

## Safety & Compliance
- **Policy Blocks**: ${metrics.policyBlockCount}
- **Escalations**: ${metrics.escalationCount} (${(metrics.escalationRate * 100).toFixed(2)}%)
- **Stopped Cases**: ${metrics.stoppedCaseCount} (${(metrics.stoppedCaseRate * 100).toFixed(2)}%)
- **Unsafe Prevented**: ${metrics.unsafeActionPreventedCount}
- **Stale Prevented**: ${metrics.staleActionPreventedCount}
- **Consent Blocks**: ${metrics.consentBlockCount}
- **Idempotent Replays**: ${metrics.idempotentReplayCount}

## Reliability & Errors
- **Evaluation Runtime**: ${metrics.evaluationRuntimeMs}ms
- **Provider Timeouts**: ${metrics.providerTimeoutCount}
- **Provider Final Failures**: ${metrics.providerFinalFailureCount}
- **Workflow Failures**: ${metrics.workflowFailures}
- **AI Requests**: ${metrics.aiDraftRequests}
- **AI Fallbacks**: ${metrics.aiFallbackCount}
`;

  fs.writeFileSync(path.join(outPath, 'summary.md'), md);
  fs.writeFileSync(path.join(outPath, 'metrics.json'), JSON.stringify(metrics, null, 2));
}
