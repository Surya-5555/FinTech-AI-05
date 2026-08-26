import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventsService } from './events.service';
import { ConcurrencyConflictError } from '@rr/persistence';

@Processor('ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private readonly eventsService: EventsService) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { dto, eventId } = job.data;
    this.logger.log(`Processing async ingestion webhook: ${eventId}`);

    try {
      const result = await this.eventsService.ingestEvent(dto, eventId);
      this.logger.log(`Successfully ingested event ${eventId}`);
      return result;
    } catch (error: any) {
      if (
        error instanceof ConcurrencyConflictError || 
        error.message?.includes('Concurrent duplicate ingestion detected') || 
        error.name === 'ConcurrencyConflictError'
      ) {
        this.logger.warn(`Duplicate ingestion detected for event ${eventId}, safely ignoring`);
        return { status: 'IGNORED', reason: 'DUPLICATE_EVENT' };
      }
      
      this.logger.error(`Error processing ingestion job ${job.id} for event ${eventId}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
