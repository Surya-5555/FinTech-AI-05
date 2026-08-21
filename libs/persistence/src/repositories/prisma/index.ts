import { RevenueCaseRepository, RevenueEventRepository, AuditLogRepository } from '../contracts/index.js';
import { getPrismaClient } from '../../client/index.js';
import { RecoveryCase, RevenueEvent, AuditLog } from '@rr/contracts';
import { prismaRevenueCaseToContract, prismaRevenueEventToContract } from '../../mappers/index.js';
import { ConcurrencyConflictError } from '../../errors/index.js';

export class PrismaRevenueCaseRepository implements RevenueCaseRepository {
  async findById(id: string): Promise<RecoveryCase | null> {
    const prisma = getPrismaClient();
    const result = await prisma.revenueCase.findUnique({ where: { id } });
    if (!result) return null;
    return prismaRevenueCaseToContract(result);
  }

  async create(rc: RecoveryCase): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.revenueCase.create({
      data: {
        id: rc.caseId,
        sourceEventId: rc.sourceEventId,
        merchantId: rc.merchantId,
        customerId: rc.customerId || null,
        amountAtRiskMinor: rc.amountAtRisk.amountMinor,
        currency: rc.amountAtRisk.currency,
        state: rc.state,
        attemptCount: rc.attemptCount,
        recoveryScore: rc.recoveryScore ?? null,
        rootCause: rc.rootCause ?? null,
        version: rc.version,
        correlationId: rc.correlationId,
      }
    });
  }

  async transitionWithVersion(rc: RecoveryCase, nextState: string, newVersion: number): Promise<void> {
    const prisma = getPrismaClient();
    const result = await prisma.revenueCase.updateMany({
      where: {
        id: rc.caseId,
        version: rc.version,
      },
      data: {
        state: nextState,
        version: newVersion,
      }
    });
    if (result.count === 0) {
      throw new ConcurrencyConflictError(`Version mismatch or case not found: ${rc.caseId}`);
    }
  }
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  async appendAuditLog(log: AuditLog): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.auditLog.create({
      data: {
        id: log.auditLogId,
        timestamp: log.timestamp,
        actorType: log.actorType,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        correlationId: log.correlationId,
        previousState: log.previousState ?? null,
        nextState: log.nextState ?? null,
        metadataJson: JSON.stringify(log.metadata),
      }
    });
  }
}
export * from './ingestion.js';
