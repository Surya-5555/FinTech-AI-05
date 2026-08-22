
import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { PrismaIngestionRepository, getPrismaClient } from '../../libs/persistence/src';
import { IngestionCommand } from '../../libs/persistence/src';
import { qualifyRevenueEvent } from '../../libs/domain/src';

describe('Duplicate event ingestion safety', () => {
  const prisma = getPrismaClient();
  const repo = new PrismaIngestionRepository();

  const merchantRef = `merch_test_${randomUUID()}`;
  const customerRef = `cust_test_${randomUUID()}`;
  const externalEventId = `evt_test_${randomUUID()}`;
  const idempotencyKey = `idemp_${randomUUID()}`;
  const correlationId = `corr_${randomUUID()}`;

  beforeAll(async () => {
    await prisma.merchant.create({
      data: {
        id: `m_${randomUUID()}`,
        externalReference: merchantRef,
        name: 'Test Merchant',
        segment: 'test',
        status: 'ACTIVE',
        configJson: '{}'
      }
    });
    await prisma.customer.create({
      data: {
        id: `c_${randomUUID()}`,
        merchantId: merchantRef, 
        externalReference: customerRef,
        displayNameOrMaskedReference: 'mask_1234',
        consentEmail: 'true',
        consentSms: 'true',
        consentVoice: 'false',
        contactWindowMetadataJson: '{}'
      }
    });
  });

  const command: IngestionCommand = {
    event: {
      externalEventId,
      eventType: 'PAYMENT_FAILED' as any,
      occurredAt: new Date(),
      amount: { amountMinor: 1000n, currency: 'INR' },
      failureReason: 'insufficient_funds' as any,
      correlationId: correlationId as any,
      rawPayloadVersion: '1.0',
      metadata: { test: true }
    },
    idempotencyKey,
    merchantReference: merchantRef,
    customerReference: customerRef,
    customerMaskedReference: 'mask_1234',
    customerConsents: { email: true as any, sms: true as any, voice: false as any }
  };

  test('Send the exact same external event twice', async () => {
    // First ingestion
    const result1 = await repo.ingestEventAndCreateCaseIfEligible(command, qualifyRevenueEvent);
    expect(result1.idempotentReplay).toBe(false);
    expect(result1.revenueCase).toBeDefined();

    // Second ingestion
    const result2 = await repo.ingestEventAndCreateCaseIfEligible(command, qualifyRevenueEvent);
    expect(result2.idempotentReplay).toBe(true);

    // Assert only one stored event exists
    const eventsCount = await prisma.revenueEvent.count({
      where: { externalEventId }
    });
    expect(eventsCount).toBe(1);

    // Assert only one case exists
    const casesCount = await prisma.revenueCase.count({
      where: { sourceEventId: result1.revenueCase?.caseId } // Wait, sourceEventId is the event's id
    });
    // Let's just count cases for this merchant and customer
    const cases = await prisma.revenueCase.findMany({
      where: { merchantId: result1.revenueCase?.merchantId }
    });
    expect(cases.length).toBe(1);
    
    // Check audit logs
    const audits = await prisma.auditLog.findMany({
      where: { correlationId }
    });
    // We expect one audit for the event, one for the case creation
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });
});
