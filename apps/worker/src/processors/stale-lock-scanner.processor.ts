import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExecutionRepository } from '@rr/persistence';

@Injectable()
export class StaleLockScannerProcessor {
  private readonly logger = new Logger(StaleLockScannerProcessor.name);

  constructor(
    @Inject('ExecutionRepository')
    private readonly executionRepo: ExecutionRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Scanning for stale locks...');
    try {
      // Escalate stale locks to prevent double execution on crash
      const escalatedCount = await this.executionRepo.escalateStaleLocks(5, 'WORKER_CRASH_AMBIGUOUS_STATE');
      
      if (escalatedCount > 0) {
        this.logger.log(`Escalated ${escalatedCount} stale locks from dead workers.`);
      }
    } catch (error) {
      this.logger.error('Failed to release stale locks', error);
    }
  }
}
