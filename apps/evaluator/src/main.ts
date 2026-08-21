import { Command } from 'commander';
import { runEvaluation } from './commands/evaluate.js';

const program = new Command();

program
  .name('evaluator')
  .description('Evaluation Framework for Revenue Recovery')
  .version('1.0.0');

program
  .command('evaluate')
  .description('Run a batch evaluation on the synthetic dataset')
  .option('-d, --dataset <path>', 'Path to dataset directory (e.g. data/evaluation/v1)', 'data/evaluation/v1')
  .option('-s, --seed <seed>', 'Seed for deterministic fallback generation (if needed)')
  .option('-o, --output-dir <path>', 'Output directory for evaluation artifacts', 'artifacts/evaluation')
  .action(async (options) => {
    try {
      await runEvaluation(options);
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

program.parse();
