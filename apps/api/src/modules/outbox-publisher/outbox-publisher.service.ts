import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import { OutboxRepository } from '@rr/persistence';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private queue: Queue | null = null;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @Inject('OutboxRepository') private readonly outboxRepo: OutboxRepository
  ) {}

  async onModuleInit() {
    const queueEnabled = process.env.QUEUE_ENABLED === 'true';
    if (!queueEnabled) {
      this.logger.warn('Queue is disabled. Outbox Publisher will not run.');
      return;
    }

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.error('REDIS_URL is required when QUEUE_ENABLED is true');
      throw new Error('REDIS_URL is missing');
    }

    const queuePrefix = process.env.QUEUE_PREFIX || 'rr';

    // We initialize the BullMQ queue
    this.queue = new Queue('recovery-plan-execution', {
      connection: new URL(redisUrl) as any, // ioredis parses it or pass directly
      prefix: queuePrefix,
    });

    this.logger.log('Outbox Publisher started. Polling every 5 seconds.');
    this.timer = setInterval(() => this.poll(), 5000);
  }

  async onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.queue) {
      await this.queue.close();
    }
  }

  private async poll() {
    if (this.isProcessing || !this.queue) return;
    this.isProcessing = true;

    try {
      const batchSize = 10;
      const lockDurationMs = 30000; // 30 seconds

      const events = await this.outboxRepo.claimPendingOutboxEvents(batchSize, lockDurationMs);
      
      for (const event of events) {
        try {
          if (event.eventType === 'INTERVENTION_ENQUEUED') {
            await this.queue.add(
              'execute-plan', 
              event.payload, 
              {
                jobId: event.payload.jobId,
                attempts: parseInt(process.env.QUEUE_ATTEMPTS || '3', 10),
                backoff: {
                  type: 'exponential',
                  delay: parseInt(process.env.QUEUE_BACKOFF_BASE_MS || '1000', 10),
                },
                removeOnComplete: true,
                removeOnFail: false,
              }
            );

            await this.outboxRepo.markOutboxPublished(event.id);
            this.logger.log(`Published outbox event ${event.id} to queue (jobId: ${event.payload.jobId})`);
          } else {
            this.logger.warn(`Unknown outbox event type: ${event.eventType}`);
            await this.outboxRepo.markOutboxFailed(event.id, `Unknown event type: ${event.eventType}`);
          }
        } catch (error: any) {
          this.logger.error(`Failed to publish outbox event ${event.id}`, error.stack);
          
          if (event.attempts >= 3) { // Arbitrary outbox retry limit
            await this.outboxRepo.markOutboxFailed(event.id, error.message);
          } else {
            // Exponential backoff for outbox
            const nextAvailable = new Date(Date.now() + Math.pow(2, event.attempts) * 1000);
            await this.outboxRepo.rescheduleOutboxEvent(event.id, nextAvailable, error.message);
          }
        }
      }
    } catch (e: any) {
      this.logger.error('Error during outbox polling', e.stack);
    } finally {
      this.isProcessing = false;
    }
  }
}
