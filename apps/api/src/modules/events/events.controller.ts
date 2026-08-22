import { Controller, Post, Body, Headers, HttpCode, HttpStatus, BadRequestException, UsePipes, ValidationPipe } from '@nestjs/common';
import { EventsService } from './events.service';
import { IngestEventDto } from './dto/ingest-event.dto';
import { generateStableHash } from '@rr/utils';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async ingestEvent(
    @Body() dto: IngestEventDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string
  ) {
    let idempotencyKey = idempotencyKeyHeader;
    if (!idempotencyKey || idempotencyKey.length > 100) {
      // Deterministic fallback if invalid or missing
      idempotencyKey = generateStableHash(`${dto.merchant.externalReference}-${dto.externalEventId}`);
    }

    try {
      const result = await this.eventsService.ingestEvent(dto, idempotencyKey);
      return result;
    } catch (e: any) {
      if (e.name === 'ConcurrencyConflictError') {
        throw new BadRequestException('Concurrent duplicate ingestion detected');
      }
      throw e;
    }
  }
}
