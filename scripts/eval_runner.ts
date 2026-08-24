import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const WORKSPACE_ROOT = path.resolve(__dirname, '../');

function extractOutPath(output: string): string {
  const match = output.match(/Evaluation complete\. Results saved to (.*)/);
  if (!match || !match[1]) {
    throw new Error('Could not find output directory in evaluate-smoke output.');
  }
  return match[1].trim();
}

function injectMetrics(filePath: string, metrics: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  const startMarker = '<!-- EVALUATION_RESULTS_START -->';
  const endMarker = '<!-- EVALUATION_RESULTS_END -->';

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.warn(`Injection markers not found in ${filePath}`);
    return;
  }

  const newContent = 
    content.substring(0, startIndex + startMarker.length) + 
    '\n' + 
    metrics.trim() + 
    '\n' + 
    content.substring(endIndex);

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Updated metrics in ${path.relative(WORKSPACE_ROOT, filePath)}`);
}

async function run() {
  console.log('Running evaluation...');
  try {
    const output = execSync('pnpm evaluate-smoke', { cwd: WORKSPACE_ROOT, encoding: 'utf8', stdio: 'pipe' });
    console.log(output);

    const outPath = extractOutPath(output);
    const summaryPath = path.join(outPath, 'summary.md');

    if (!fs.existsSync(summaryPath)) {
      throw new Error(`Summary file not found at ${summaryPath}`);
    }

    const summaryContent = fs.readFileSync(summaryPath, 'utf8');
    
    // We want to skip the `# Evaluation Summary` title from the injection, 
    // because README.md and EVALUATION.md already have their own section titles.
    const metricsToInject = summaryContent.replace(/^# Evaluation Summary\s+/m, '').trim();

    injectMetrics(path.join(WORKSPACE_ROOT, 'README.md'), metricsToInject);
    injectMetrics(path.join(WORKSPACE_ROOT, 'docs/evaluation/EVALUATION.md'), metricsToInject);

    console.log('✅ Break Circular Evaluation Dependency: Documentation successfully updated with fresh metrics.');
  } catch (err: any) {
    console.error('Evaluation failed!');
    if (err.stdout) {
      console.error(err.stdout);
    }
    if (err.stderr) {
      console.error(err.stderr);
    }
    process.exit(1);
  }
}

run();
