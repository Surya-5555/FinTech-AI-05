import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FailuresService {
  private get artifactsDir() {
    return path.join(process.cwd(), '..', '..', 'artifacts', 'failures');
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
      return runs.sort((a, b) => b.id.localeCompare(a.id));
    } catch (e) {
      return [];
    }
  }

  async getRunById(runId: string) {
    try {
      const summaryPath = path.join(this.artifactsDir, runId, 'summary.json');
      const detailsPath = path.join(this.artifactsDir, runId, 'details.json');
      const summaryRaw = await fs.readFile(summaryPath, 'utf-8');
      
      let details = [];
      try {
        const detailsRaw = await fs.readFile(detailsPath, 'utf-8');
        details = JSON.parse(detailsRaw);
      } catch(e) {}

      return {
        id: runId,
        summary: JSON.parse(summaryRaw),
        details
      };
    } catch (e) {
      return null;
    }
  }
}
