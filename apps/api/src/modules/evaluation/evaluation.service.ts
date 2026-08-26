import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class EvaluationService {
  private get artifactsDir() {
    const root = process.cwd().includes('apps') 
      ? path.join(process.cwd(), '..', '..')
      : process.cwd();
    return path.join(root, 'artifacts', 'evaluation');
  }

  async getRuns() {
    try {
      const dir = await fs.readdir(this.artifactsDir);
      const runs = [];
      for (const entry of dir) {
        if (entry.startsWith('run-')) {
          try {
            const summaryPath = path.join(this.artifactsDir, entry, 'summary.json');
            const summaryRaw = await fs.readFile(summaryPath, 'utf-8');
            const summary = JSON.parse(summaryRaw);
            runs.push({ id: entry, ...summary });
          } catch (e) {
            // Ignore missing summary
          }
        }
      }
      // Sort by timestamp descending
      return runs.sort((a, b) => b.id.localeCompare(a.id));
    } catch (e) {
      return [];
    }
  }

  async getRunById(runId: string) {
    try {
      const metricsPath = path.join(this.artifactsDir, runId, 'metrics.json');
      const summaryPath = path.join(this.artifactsDir, runId, 'summary.json');
      const metricsRaw = await fs.readFile(metricsPath, 'utf-8');
      const summaryRaw = await fs.readFile(summaryPath, 'utf-8');
      
      return {
        id: runId,
        summary: JSON.parse(summaryRaw),
        metrics: JSON.parse(metricsRaw)
      };
    } catch (e) {
      return null;
    }
  }
}
