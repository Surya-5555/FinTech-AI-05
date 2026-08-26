import { Controller, Post, Body, Headers, HttpCode, HttpStatus, BadRequestException, UsePipes, ValidationPipe, UseGuards, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IngestEventDto } from './dto/ingest-event.dto';

import { RazorpayWebhookGuard } from '../../common/guards/razorpay-webhook.guard';

@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(
    @InjectQueue('ingestion') private readonly ingestionQueue: Queue
  ) {}

  @Post('ingest')
  @UseGuards(RazorpayWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async ingestEvent(
    @Body() dto: IngestEventDto,
    @Headers('x-razorpay-event-id') razorpayEventId: string
  ) {
    if (!razorpayEventId) {
      throw new BadRequestException('Missing x-razorpay-event-id header');
    }

    // Decouple database writes via BullMQ to respect the 5s webhook timeout rule.
    await this.ingestionQueue.add('process-ingestion', {
      dto,
      eventId: razorpayEventId
    }, {
      jobId: razorpayEventId // BullMQ level deduplication
    });

    this.logger.log(`Ingestion queued successfully for event: ${razorpayEventId}`);
    
    return { success: true, status: 'QUEUED' };
  }
}
