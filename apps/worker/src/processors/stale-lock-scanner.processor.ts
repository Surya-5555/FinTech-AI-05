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
      // Release locks older than 5 minutes
      const releasedCount = await this.executionRepo.releaseStaleLocks(5);
      
      if (releasedCount > 0) {
        this.logger.log(`Released ${releasedCount} stale locks from dead workers.`);
      }
    } catch (error) {
      this.logger.error('Failed to release stale locks', error);
    }
  }
}
