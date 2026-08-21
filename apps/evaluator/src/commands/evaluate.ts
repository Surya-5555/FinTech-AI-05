import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { Dataset, Baselines, Metrics, Reporting } from '@rr/evaluation';

export interface EvaluateOptions {
  dataset: string;
  seed?: string;
  outputDir: string;
}

export async function runEvaluation(options: EvaluateOptions) {
  console.log(chalk.blue(`[1/5] Loading Dataset from ${options.dataset}...`));
  const workspaceRoot = path.resolve(process.cwd(), '../../');
  const heldOutPath = path.join(workspaceRoot, options.dataset, 'heldout.jsonl');
  const manifestPath = path.join(workspaceRoot, options.dataset, 'manifest.json');

  if (!fs.existsSync(heldOutPath) || !fs.existsSync(manifestPath)) {
    throw new Error(`Dataset not found at ${options.dataset}`);
  }

  const manifest: Dataset.EvaluationManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const casesText = fs.readFileSync(heldOutPath, 'utf8');
  const cases: Dataset.EvaluationCase[] = casesText.trim().split('\n').map(line => JSON.parse(line));

  console.log(chalk.green(`Loaded ${cases.length} cases (Manifest Checksum: ${manifest.checksum})`));

  const baseline0 = new Baselines.Baseline0Strategy();
  const baseline1 = new Baselines.Baseline1Strategy();
  const sut = new Baselines.SystemUnderTestStrategy();

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
  const metrics = Metrics.MetricsCalculator.compute(cases, b0Results, b1Results, sutResults);

  console.log(chalk.blue(`[4/5] Running Integrity Assertions...`));
  Metrics.IntegrityAssertions.assertValid(metrics);

  console.log(chalk.blue(`[5/5] Generating Reports...`));
  const runId = `run-${Date.now()}`;
  const outPath = path.join(workspaceRoot, options.outputDir, runId);
  fs.mkdirSync(outPath, { recursive: true });

  Reporting.generateReport(outPath, manifest, metrics, {
    cases,
    b0Results,
    b1Results,
    sutResults
  });

  console.log(chalk.green(`Evaluation complete. Results saved to ${outPath}`));
}
