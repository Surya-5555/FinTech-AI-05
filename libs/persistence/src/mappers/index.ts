// Placeholder mappers for translating between Prisma types and Domain types.
import { RecoveryCase, RecoveryPlan, AuditLog, InterventionOutcome, EvaluationRun, RevenueEvent, EventType, PaymentFailureReason, RevenueCaseState, InterventionType, InterventionStatus, AuditActorType, AuditAction } from '@rr/contracts';
import type { 
  RevenueCase as PrismaRevenueCase, 
  RecoveryPlan as PrismaRecoveryPlan, 
  AuditLog as PrismaAuditLog,
  Intervention as PrismaIntervention,
  EvaluationRun as PrismaEvaluationRun,
  RevenueEvent as PrismaRevenueEvent
} from '@prisma/client';
import { createMoney } from '@rr/domain';

export function prismaRevenueEventToContract(pr: PrismaRevenueEvent): RevenueEvent {
  return {
    eventId: pr.id as any,
    externalEventId: pr.externalEventId,
    merchantId: pr.merchantId as any,
    customerId: (pr.customerId || '') as any,
    eventType: pr.eventType as EventType,
    occurredAt: pr.occurredAt,
    amount: createMoney(pr.amountMinor, pr.currency),
    ...(pr.failureReason ? { failureReason: pr.failureReason as PaymentFailureReason } : {}),
    correlationId: pr.correlationId as any,
    rawPayloadVersion: pr.rawPayloadVersion,
    metadata: JSON.parse(pr.metadataJson),
  };
}

export function prismaRevenueCaseToContract(pr: PrismaRevenueCase): RecoveryCase {
  return {
    caseId: pr.id as any,
    sourceEventId: pr.sourceEventId as any,
    merchantId: pr.merchantId as any,
    customerId: (pr.customerId || '') as any,
    amountAtRisk: createMoney(pr.amountAtRiskMinor, pr.currency),
    state: pr.state as RevenueCaseState,
    attemptCount: pr.attemptCount,
    ...(pr.recoveryScore ? { recoveryScore: pr.recoveryScore } : {}),
    ...(pr.rootCause ? { rootCause: pr.rootCause } : {}),
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    version: pr.version,
    correlationId: pr.correlationId as any,
  };
}
// Additional mappers will be filled in as needed.
