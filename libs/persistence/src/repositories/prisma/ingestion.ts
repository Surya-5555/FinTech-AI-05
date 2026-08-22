import { IngestionCommand, IngestionRepository } from '../contracts/ingestion';
import { IngestionResult, MerchantConfig, RevenueEvent, RecoveryCase, AuditLog } from '@rr/contracts';
import { getPrismaClient } from '../../client/index';
import { generateId } from '@rr/utils';
import { ConcurrencyConflictError } from '../../errors/index';

export class PrismaIngestionRepository implements IngestionRepository {
  async ingestEventAndCreateCaseIfEligible(
    command: IngestionCommand,
    qualifyFn: (event: RevenueEvent, config: MerchantConfig, merchantSegment: string) => import('@rr/contracts').QualificationResult
  ): Promise<IngestionResult> {
    const prisma = getPrismaClient();

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Check idempotency
        const existingEvent = await tx.revenueEvent.findUnique({
          where: { ingestionIdempotencyKey: command.idempotencyKey }
        });

        if (existingEvent) {
          // It's a duplicate request
          const existingCaseModel = await tx.revenueCase.findUnique({
            where: { sourceEventId: existingEvent.id }
          });

          // Fetch the mock or existing merchant to get segment
          const existingMerchant = await tx.merchant.findUnique({
            where: { id: existingEvent.merchantId }
          });
          const merchantSegment = existingMerchant ? existingMerchant.segment : 'default';

          const dummyConfig: MerchantConfig = {
            supportedEventTypes: ['PAYMENT_FAILED', 'SUBSCRIPTION_FAILED', 'INVOICE_OVERDUE', 'CHECKOUT_ABANDONED'] as any,
            minimumAmountMinor: 100n,
            eventMaxAgeHours: 24,
            excludedMerchantSegments: [],
            supportedCurrencies: ['INR', 'USD']
          };

          const mockEvent: RevenueEvent = {
            eventId: existingEvent.id as any,
            externalEventId: existingEvent.externalEventId,
            merchantId: existingEvent.merchantId as any,
            customerId: existingEvent.customerId as any,
            eventType: existingEvent.eventType as any,
            occurredAt: existingEvent.occurredAt,
            amount: { amountMinor: existingEvent.amountMinor, currency: existingEvent.currency },
            correlationId: existingEvent.correlationId as any,
            rawPayloadVersion: existingEvent.rawPayloadVersion,
            metadata: JSON.parse(existingEvent.metadataJson)
          };

          const qual = qualifyFn(mockEvent, dummyConfig, merchantSegment);

          const rc: RecoveryCase | null = existingCaseModel ? {
            caseId: existingCaseModel.id as any,
            sourceEventId: existingCaseModel.sourceEventId as any,
            merchantId: existingCaseModel.merchantId as any,
            customerId: (existingCaseModel.customerId as any) || undefined,
            amountAtRisk: { amountMinor: existingCaseModel.amountAtRiskMinor, currency: existingCaseModel.currency },
            state: existingCaseModel.state as any,
            attemptCount: existingCaseModel.attemptCount,
            version: existingCaseModel.version,
            correlationId: existingCaseModel.correlationId as any,
            createdAt: existingCaseModel.createdAt,
            updatedAt: existingCaseModel.updatedAt
          } : null;

          return {
            event: mockEvent,
            qualification: qual,
            revenueCase: rc,
            correlationId: existingEvent.correlationId,
            idempotentReplay: true
          };
        }

        // 2. Resolve/create merchant (demo only)
        // Check if config allows demo creation. (assuming true for now or based on env)
        const allowDemoCreation = process.env.ALLOW_DEMO_ENTITY_CREATION === 'true';
        let merchant = await tx.merchant.findUnique({
          where: { externalReference: command.merchantReference }
        });

        if (!merchant) {
          if (!allowDemoCreation) {
            // we will let the application service handle NOT_FOUND but here we can throw or just throw custom error
            throw new Error('MerchantNotFound');
          }
          merchant = await tx.merchant.create({
            data: {
              externalReference: command.merchantReference,
              name: 'Demo Merchant',
              segment: 'subscription',
              status: 'ACTIVE',
              configJson: '{}'
            }
          });
        }

        // 3. Resolve/create masked customer
        let customer = await tx.customer.findUnique({
          where: {
            merchantId_externalReference: {
              merchantId: merchant.id,
              externalReference: command.customerReference
            }
          }
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              merchantId: merchant.id,
              externalReference: command.customerReference,
              displayNameOrMaskedReference: command.customerMaskedReference,
              consentEmail: String(command.customerConsents.email),
              consentSms: String(command.customerConsents.sms),
              consentVoice: String(command.customerConsents.voice),
              contactWindowMetadataJson: '{}'
            }
          });
        }

        // 4. Persist event
        const eventId = command.event.eventId || generateId('evt');
        const createdEvent = await tx.revenueEvent.create({
          data: {
            id: eventId,
            externalEventId: command.event.externalEventId,
            merchantId: merchant.id,
            customerId: customer.id,
            eventType: command.event.eventType,
            amountMinor: command.event.amount.amountMinor,
            currency: command.event.amount.currency,
            failureReason: command.event.failureReason || null,
            occurredAt: command.event.occurredAt,
            correlationId: command.event.correlationId,
            rawPayloadVersion: command.event.rawPayloadVersion,
            metadataJson: JSON.stringify(command.event.metadata),
            ingestionIdempotencyKey: command.idempotencyKey
          }
        });

        command.event.eventId = eventId as any;
        command.event.merchantId = merchant.id as any;
        command.event.customerId = customer.id as any;

        // 5. Audit EVENT_INGESTED
        await tx.auditLog.create({
          data: {
            timestamp: new Date(),
            actorType: 'SYSTEM',
            action: 'EVENT_INGESTED',
            entityType: 'RevenueEvent',
            entityId: eventId,
            correlationId: command.event.correlationId,
            metadataJson: JSON.stringify({ idempotencyKey: command.idempotencyKey })
          }
        });

        // 6. Run qualification
        // we parse merchant config
        const merchantConfig: MerchantConfig = {
          supportedEventTypes: ['PAYMENT_FAILED', 'SUBSCRIPTION_FAILED', 'INVOICE_OVERDUE', 'CHECKOUT_ABANDONED'] as any,
          minimumAmountMinor: 100n,
          eventMaxAgeHours: 24,
          excludedMerchantSegments: [],
          supportedCurrencies: ['INR', 'USD']
        };

        const qual = qualifyFn(command.event, merchantConfig, merchant.segment);

        // 7. Create case if eligible
        let rc: RecoveryCase | null = null;
        if (qual.shouldCreateCase && qual.initialState && qual.amountAtRisk) {
          const caseId = generateId('case');
          const caseModel = await tx.revenueCase.create({
            data: {
              id: caseId,
              sourceEventId: eventId,
              merchantId: merchant.id,
              customerId: customer.id,
              amountAtRiskMinor: qual.amountAtRisk.amountMinor,
              currency: qual.amountAtRisk.currency,
              state: qual.initialState,
              attemptCount: 0,
              version: 1,
              correlationId: command.event.correlationId,
            }
          });

          rc = {
            caseId: caseId as any,
            sourceEventId: eventId as any,
            merchantId: merchant.id as any,
            customerId: customer.id as any,
            amountAtRisk: qual.amountAtRisk,
            state: qual.initialState,
            attemptCount: 0,
            version: 1,
            correlationId: command.event.correlationId as any,
            createdAt: caseModel.createdAt,
            updatedAt: caseModel.updatedAt
          };

          await tx.auditLog.create({
            data: {
              timestamp: new Date(),
              actorType: 'SYSTEM',
              action: 'CASE_CREATED',
              entityType: 'RevenueCase',
              entityId: caseId,
              correlationId: command.event.correlationId,
              nextState: qual.initialState,
              metadataJson: JSON.stringify({ reasonCodes: qual.reasonCodes })
            }
          });
        }

        return {
          event: command.event,
          qualification: qual,
          revenueCase: rc,
          correlationId: command.event.correlationId,
          idempotentReplay: false
        };
      });
    } catch (e: any) {
      if (e.code === 'P2002' && e.meta?.target?.includes('ingestionIdempotencyKey')) {
        throw new ConcurrencyConflictError('Concurrent duplicate ingestion detected');
      }
      throw e;
    }
  }
}
