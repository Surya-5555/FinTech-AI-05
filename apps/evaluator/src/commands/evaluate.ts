import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { EvaluationCase, EvaluationManifest } from '@rr/evaluation/dataset/schemas.js';
import { Baseline0Strategy, Baseline1Strategy, SystemUnderTestStrategy } from '@rr/evaluation/baselines/index.js';
import { MetricsCalculator, IntegrityAssertions } from '@rr/evaluation/metrics/index.js';
import { generateReport } from '@rr/evaluation/reporting/index.js';

export interface EvaluateOptions {
  dataset: string;
  seed?: string;
  outputDir: string;
}

export async function runEvaluation(options: EvaluateOptions) {
  console.log(chalk.blue(`[1/5] Loading Dataset from ${options.dataset}...`));
  const heldOutPath = path.join(process.cwd(), options.dataset, 'heldout.jsonl');
  const manifestPath = path.join(process.cwd(), options.dataset, 'manifest.json');

  if (!fs.existsSync(heldOutPath) || !fs.existsSync(manifestPath)) {
    throw new Error(`Dataset not found at ${options.dataset}`);
  }

  const manifest: EvaluationManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const casesText = fs.readFileSync(heldOutPath, 'utf8');
  const cases: EvaluationCase[] = casesText.trim().split('\n').map(line => JSON.parse(line));

  console.log(chalk.green(`Loaded ${cases.length} cases (Manifest Checksum: ${manifest.checksum})`));

  const baseline0 = new Baseline0Strategy();
  const baseline1 = new Baseline1Strategy();
  const sut = new SystemUnderTestStrategy();

  const b0Results = [];
  const b1Results = [];
  const sutResults = [];

  console.log(chalk.blue(`[2/5] Running Strategies...`));
  // In a real environment, this isolates the database state between runs.
  // For the skeletal version, we just run sequentially.
  
  for (const c of cases) {
    b0Results.push(await baseline0.evaluate(c));
    b1Results.push(await baseline1.evaluate(c));
    sutResults.push(await sut.evaluate(c));
  }
  
  console.log(chalk.blue(`[3/5] Computing Metrics...`));
  const metrics = MetricsCalculator.compute(cases, b0Results, b1Results, sutResults);

  console.log(chalk.blue(`[4/5] Running Integrity Assertions...`));
  IntegrityAssertions.assertValid(metrics);

  console.log(chalk.blue(`[5/5] Generating Reports...`));
  const runId = `run-${Date.now()}`;
  const outPath = path.join(process.cwd(), options.outputDir, runId);
  fs.mkdirSync(outPath, { recursive: true });

  generateReport(outPath, manifest, metrics, {
    cases,
    b0Results,
    b1Results,
    sutResults
  });

  console.log(chalk.green(`Evaluation complete. Results saved to ${outPath}`));
}
