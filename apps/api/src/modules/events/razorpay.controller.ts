import { Controller, Post, Body, Headers, HttpCode, HttpStatus, BadRequestException, Logger, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { getPrismaClient } from '@rr/persistence';
import { RevenueCaseState } from '@rr/contracts';
import { RazorpayWebhookGuard } from '../../common/guards/razorpay-webhook.guard';

@Controller('razorpay')
export class RazorpayController {
  private readonly logger = new Logger(RazorpayController.name);

  constructor(
    @InjectQueue('razorpay-events') private readonly razorpayEventQueue: Queue,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RazorpayWebhookGuard)
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-razorpay-event-id') eventId: string
  ) {
    if (!eventId) {
      throw new BadRequestException('Missing x-razorpay-event-id header');
    }

    const prisma = getPrismaClient();

    // 1. Strict Header-Based Idempotency
    try {
      await prisma.eventIdempotency.create({
        data: { eventId }
      });
    } catch (e: any) {
      if (e.code === 'P2002') { // Prisma unique constraint violation
        this.logger.warn(`Duplicate webhook payload silently dropped. Event ID: ${eventId}`);
        return { status: 'IGNORED', reason: 'DUPLICATE_EVENT' };
      }
      throw e;
    }

    // 2. Asynchronous Queue Processing (Decoupled to prevent 5s timeout)
    await this.razorpayEventQueue.add('process-webhook', {
      eventId,
      payload
    }, {
      jobId: eventId // Additional BullMQ level deduplication
    });

    this.logger.log(`Webhook queued successfully for background processing: ${eventId}`);
    return { status: 'SUCCESS' };
  }
}
