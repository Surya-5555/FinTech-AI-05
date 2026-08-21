import { OutboxRepository, OutboxEventRecord } from '../contracts/outbox.js';
import { getPrismaClient } from '../../client/index.js';
import { randomUUID } from 'crypto';

export class PrismaOutboxRepository implements OutboxRepository {
  async claimPendingOutboxEvents(batchSize: number, lockDurationMs: number): Promise<OutboxEventRecord[]> {
    const prisma = getPrismaClient();
    const now = new Date();
    const lockUntil = new Date(now.getTime() + lockDurationMs);
    const workerId = randomUUID();

    // 1. Find and lock events that are PENDING and available
    // Using a raw query for true atomic find-and-update is safest, but we can do it with Prisma interactive transaction.
    // However, a simple updateMany where lockedAt < now or lockedAt is null is better.

    const claimed = await prisma.$transaction(async (tx) => {
      // Postgres-specific SKIP LOCKED would be ideal, but fallback to Prisma `findMany` + `updateMany`
      // Or just a raw update with RETURNING
      const rawRes = await tx.$queryRaw<any[]>`
        UPDATE "OutboxEvent"
        SET "lockedAt" = ${lockUntil}, "lockedBy" = ${workerId}
        WHERE id IN (
          SELECT id FROM "OutboxEvent"
          WHERE status = 'PENDING'
            AND "availableAt" <= ${now}
            AND ("lockedAt" IS NULL OR "lockedAt" < ${now})
          ORDER BY "createdAt" ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *;
      `;
      return rawRes;
    });

    return claimed.map(row => ({
      id: row.id,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
      payload: JSON.parse(row.payloadJson),
      status: row.status as any,
      idempotencyKey: row.idempotencyKey,
      attempts: row.attempts,
      availableAt: row.availableAt,
    }));
  }

  async markOutboxPublished(eventId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async rescheduleOutboxEvent(eventId: string, nextAvailableAt: Date, errorMsg: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        attempts: { increment: 1 },
        availableAt: nextAvailableAt,
        lastError: errorMsg,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async markOutboxFailed(eventId: string, errorMsg: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: 'FAILED',
        lastError: errorMsg,
        attempts: { increment: 1 },
        lockedAt: null,
        lockedBy: null,
      },
    });
  }
}
