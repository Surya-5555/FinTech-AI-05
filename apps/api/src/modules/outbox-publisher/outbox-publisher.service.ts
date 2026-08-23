import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import { OutboxRepository } from '@rr/persistence';
import { Client } from 'pg';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private queue: Queue | null = null;
  private pgClient: Client | null = null;
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

    const Redis = require('ioredis');

    // We initialize the BullMQ queue
    this.queue = new Queue('recovery-plan-execution', {
      connection: new Redis(redisUrl, { maxRetriesPerRequest: null }),
      prefix: queuePrefix,
    });

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      this.logger.error('DATABASE_URL is required for Outbox pg_notify');
      throw new Error('DATABASE_URL is missing');
    }

    this.pgClient = new Client({ connectionString: databaseUrl });
    
    try {
      await this.pgClient.connect();
      
      this.pgClient.on('notification', (msg: any) => {
        if (msg.channel === 'outbox_event_created') {
          this.poll();
        }
      });
      
      this.pgClient.on('error', (err: any) => {
        this.logger.error('PostgreSQL client error in OutboxPublisherService', err);
      });
      
      await this.pgClient.query('LISTEN outbox_event_created');
      this.logger.log('Outbox Publisher started. Listening on outbox_event_created.');
      
      // Initial poll to clear backlog
      this.poll();
    } catch (err: any) {
      this.logger.error('Failed to connect PostgreSQL client for outbox listener', err.stack);
    }
  }

  async onModuleDestroy() {
    if (this.pgClient) {
      await this.pgClient.end();
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
