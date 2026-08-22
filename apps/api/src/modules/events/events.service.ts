import { Injectable, Logger } from '@nestjs/common';
import { IngestEventDto } from './dto/ingest-event.dto';
import { PrismaIngestionRepository, IngestionCommand } from '@rr/persistence';
import { generateStableHash } from '@rr/utils';
import { qualifyRevenueEvent } from '@rr/domain';
import { RevenueCaseState } from '@rr/contracts';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private ingestionRepository = new PrismaIngestionRepository();

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
      } as any, 
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

    const isRecovered = result.revenueCase?.state === RevenueCaseState.RECOVERED;
    const isCreated = !!result.revenueCase && !isRecovered && !result.idempotentReplay;

    return {
      success: true,
      correlationId: result.correlationId,
      idempotentReplay: result.idempotentReplay,
      qualification: {
        eligible: result.qualification.eligible,
        reasons: result.qualification.reasonCodes
      },
      caseCreated: isCreated,
      caseRecovered: isRecovered,
      caseId: result.revenueCase?.caseId
    };
  }
}
