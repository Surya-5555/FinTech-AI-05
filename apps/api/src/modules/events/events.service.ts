import { Injectable, Logger } from '@nestjs/common';
import { IngestEventDto } from './dto/ingest-event.dto.js';
import { PrismaIngestionRepository, IngestionCommand } from '@rr/persistence';
import { generateStableHash } from '@rr/utils';
import { qualifyRevenueEvent } from '@rr/domain';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private ingestionRepository = new PrismaIngestionRepository();

  // keeping constructor empty or using DI if module provides it. 
  // Wait, I will just mock getPrismaClient in the test.

  async ingestEvent(dto: IngestEventDto, idempotencyKey: string) {
    this.logger.log(`Ingesting event ${dto.externalEventId} with idempotency key ${idempotencyKey}`);

    const command: IngestionCommand = {
      event: {
        externalEventId: dto.externalEventId,
        eventType: dto.eventType as any,
        occurredAt: new Date(dto.occurredAt),
        amount: {
          amountMinor: BigInt(dto.amount.amountMinor),
          currency: dto.amount.currency
        },
        failureReason: dto.failureReason as any,
        correlationId: generateStableHash(`${dto.externalEventId}-${idempotencyKey}`),
        rawPayloadVersion: '1.0',
        metadata: dto.metadata || {}
      } as any, // ID and other fields will be set by repository
      idempotencyKey,
      merchantReference: dto.merchant.externalReference,
      customerReference: dto.customer.externalReference,
      customerMaskedReference: dto.customer.maskedReference,
      customerConsents: {
        email: dto.customer.consents.email,
        sms: dto.customer.consents.sms,
        voice: dto.customer.consents.voice
      }
    };

    const result = await this.ingestionRepository.ingestEventAndCreateCaseIfEligible(
      command,
      qualifyRevenueEvent
    );

    return {
      success: true,
      correlationId: result.correlationId,
      idempotentReplay: result.idempotentReplay,
      qualification: {
        eligible: result.qualification.eligible,
        reasons: result.qualification.reasonCodes
      },
      caseCreated: !!result.revenueCase,
      caseId: result.revenueCase?.caseId
    };
  }
}
