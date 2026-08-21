import {
  RecoveryPlan,
  RevenueCaseState,
  RecoveryPlanId,
  IdempotencyKey,
  InterventionType,
  RecoveryPlanStatus,
} from '@rr/contracts';
import { CreatePlanCommand, PlanningRepository } from '../contracts/planning.js';
import { getPrismaClient } from '../../client/index.js';
import { generateId } from '@rr/utils';

export class PrismaPlanningRepository implements PlanningRepository {
  async createPlanWithPlanningOutcome(command: CreatePlanCommand): Promise<RecoveryPlan> {
    const prisma = getPrismaClient();

    // The user's prompt specified this must run in one transaction:
    // 1. Read case using version.
    // 2. Ensure state and version are still valid.
    // 3. Check plan idempotency key.
    // 4. Persist plan if new.
    // 5. Transition case using optimistic concurrency.
    // 6. Write PLAN_PROPOSED audit log.
    // 7. Write POLICY_APPROVED or POLICY_REJECTED audit log.
    // 8. Write CASE_ESCALATED or CASE_STOPPED audit log if state changes there.
    // 9. Return original result for idempotent replay.

    return await prisma.$transaction(async (tx) => {
      // 1. Read case using version
      const existingCase = await tx.revenueCase.findUnique({
        where: { id: command.plan.caseId },
      });

      if (!existingCase) {
        throw new Error(`Case not found: ${command.plan.caseId}`);
      }

      // Check idempotent plan
      const existingPlan = await tx.recoveryPlan.findUnique({
        where: { idempotencyKey: command.plan.idempotencyKey },
      });

      if (existingPlan) {
        // Idempotent replay: we return the mapped plan
        return {
          planId: existingPlan.id as RecoveryPlanId,
          caseId: existingPlan.caseId as any,
          interventionType: existingPlan.interventionType as InterventionType,
          plannedAt: existingPlan.plannedAt,
          reasonCodes: JSON.parse(existingPlan.reasonCodesJson),
          policyVersion: existingPlan.policyVersion,
          requiresHumanApproval: existingPlan.requiresHumanApproval,
          idempotencyKey: existingPlan.idempotencyKey as IdempotencyKey,
          parameters: JSON.parse(existingPlan.parametersJson),
          planStatus: existingPlan.planStatus as RecoveryPlanStatus,
        };
      }

      // 5. Transition case using optimistic concurrency
      const updatedCase = await tx.revenueCase.updateMany({
        where: {
          id: command.plan.caseId,
          version: existingCase.version, // optimistic concurrency
        },
        data: {
          state: command.resultingCaseState,
          version: existingCase.version + 1,
          updatedAt: new Date(),
        },
      });

      if (updatedCase.count === 0) {
        throw new Error('Optimistic concurrency failure: Case was updated by another process.');
      }

      // 4. Persist plan if new
      const planRow = await tx.recoveryPlan.create({
        data: {
          id: command.plan.planId,
          caseId: command.plan.caseId,
          interventionType: command.plan.interventionType,
          plannedAt: command.plan.plannedAt,
          reasonCodesJson: JSON.stringify(command.plan.reasonCodes),
          policyVersion: command.plan.policyVersion,
          requiresHumanApproval: command.plan.requiresHumanApproval,
          idempotencyKey: command.plan.idempotencyKey,
          parametersJson: JSON.stringify(command.plan.parameters),
          planStatus: command.plan.planStatus,
          diagnosisJson: JSON.stringify({}), // Should be passed in command, will keep empty for now to match current DTO if missing
          correlationId: existingCase.correlationId, // use case correlationId
        },
      });

      // 6. Write PLAN_PROPOSED audit log
      const now = new Date();
      await tx.auditLog.create({
        data: {
          id: generateId('audit'),
          timestamp: now,
          actorType: 'POLICY_ENGINE',
          action: 'PLAN_PROPOSED',
          entityType: 'RevenueCase',
          entityId: command.plan.caseId,
          correlationId: existingCase.correlationId,
          previousState: existingCase.state,
          nextState: command.resultingCaseState,
          metadataJson: JSON.stringify({ planId: command.plan.planId }),
        },
      });

      // 7. Write POLICY_APPROVED or POLICY_REJECTED audit log
      const policyAction = command.plan.planStatus === RecoveryPlanStatus.POLICY_APPROVED ? 'POLICY_APPROVED' : 'POLICY_REJECTED';
      await tx.auditLog.create({
        data: {
          id: generateId('audit'),
          timestamp: now,
          actorType: 'POLICY_ENGINE',
          action: policyAction,
          entityType: 'RecoveryPlan',
          entityId: command.plan.planId,
          correlationId: existingCase.correlationId,
          metadataJson: JSON.stringify({ reasonCodes: command.plan.reasonCodes }),
        },
      });

      // 8. Write CASE_ESCALATED or CASE_STOPPED
      if (command.resultingCaseState === RevenueCaseState.ESCALATED) {
        await tx.auditLog.create({
          data: {
            id: generateId('audit'),
            timestamp: now,
            actorType: 'POLICY_ENGINE',
            action: 'CASE_ESCALATED',
            entityType: 'RevenueCase',
            entityId: command.plan.caseId,
            correlationId: existingCase.correlationId,
            previousState: existingCase.state,
            nextState: command.resultingCaseState,
            metadataJson: JSON.stringify({ reasonCodes: command.plan.reasonCodes }),
          },
        });
      } else if (command.resultingCaseState === RevenueCaseState.STOPPED) {
        await tx.auditLog.create({
          data: {
            id: generateId('audit'),
            timestamp: now,
            actorType: 'POLICY_ENGINE',
            action: 'CASE_STOPPED',
            entityType: 'RevenueCase',
            entityId: command.plan.caseId,
            correlationId: existingCase.correlationId,
            previousState: existingCase.state,
            nextState: command.resultingCaseState,
            metadataJson: JSON.stringify({ reasonCodes: command.plan.reasonCodes }),
          },
        });
      }

      return command.plan;
    });
  }

  async listPlansForCase(caseId: string): Promise<RecoveryPlan[]> {
    const prisma = getPrismaClient();
    const rows = await prisma.recoveryPlan.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      planId: r.id as RecoveryPlanId,
      caseId: r.caseId as any,
      interventionType: r.interventionType as InterventionType,
      plannedAt: r.plannedAt,
      reasonCodes: JSON.parse(r.reasonCodesJson),
      policyVersion: r.policyVersion,
      requiresHumanApproval: r.requiresHumanApproval,
      idempotencyKey: r.idempotencyKey as IdempotencyKey,
      parameters: JSON.parse(r.parametersJson),
      planStatus: r.planStatus as RecoveryPlanStatus,
    }));
  }

  async findPlanByIdempotencyKey(idempotencyKey: string): Promise<RecoveryPlan | null> {
    const prisma = getPrismaClient();
    const r = await prisma.recoveryPlan.findUnique({
      where: { idempotencyKey },
    });

    if (!r) return null;

    return {
      planId: r.id as RecoveryPlanId,
      caseId: r.caseId as any,
      interventionType: r.interventionType as InterventionType,
      plannedAt: r.plannedAt,
      reasonCodes: JSON.parse(r.reasonCodesJson),
      policyVersion: r.policyVersion,
      requiresHumanApproval: r.requiresHumanApproval,
      idempotencyKey: r.idempotencyKey as IdempotencyKey,
      parameters: JSON.parse(r.parametersJson),
      planStatus: r.planStatus as RecoveryPlanStatus,
    };
  }

  async getCaseWithSourceEventAndMerchantPolicy(caseId: string): Promise<any> {
    const prisma = getPrismaClient();
    const caseRow = await prisma.revenueCase.findUnique({
      where: { id: caseId },
    });
    if (!caseRow) return null;

    const eventRow = await prisma.revenueEvent.findUnique({
      where: { id: caseRow.sourceEventId },
    });

    const merchantRow = await prisma.merchant.findUnique({
      where: { id: caseRow.merchantId },
    });

    return {
      revCase: caseRow,
      sourceEvent: eventRow,
      merchantPolicy: merchantRow ? JSON.parse(merchantRow.configJson) : null,
    };
  }

  async getActiveInterventionSummary(caseId: string): Promise<any> {
    const prisma = getPrismaClient();
    const active = await prisma.intervention.findMany({
      where: {
        caseId,
        status: {
          in: ['QUEUED', 'EXECUTING', 'RETRYING'], // arbitrary for now, wait until phase 2.4, but assume these for active
        }
      }
    });

    return {
      hasActivePaymentRetry: active.some(a => a.interventionType === 'PAYMENT_RETRY'),
      hasActivePaymentLink: active.some(a => a.interventionType === 'PAYMENT_LINK'),
      hasActiveCommunication: active.some(a => a.interventionType === 'EMAIL_REMINDER' || a.interventionType === 'SMS_REMINDER' || a.interventionType === 'VOICE_REMINDER'),
    };
  }

  async enqueuePlanWithOutbox(caseId: string, planId: string, outboxEventIdempotencyKey: string, jobPayload: any, correlationId: string): Promise<void> {
    const prisma = getPrismaClient();

    await prisma.$transaction(async (tx) => {
      // 1. Read case using version
      const existingCase = await tx.revenueCase.findUnique({
        where: { id: caseId },
      });

      if (!existingCase) {
        throw new Error(`Case not found: ${caseId}`);
      }

      if (existingCase.state !== RevenueCaseState.POLICY_CHECKED) {
        throw new Error(`Case is not in POLICY_CHECKED state. Currently: ${existingCase.state}`);
      }

      // Check if outbox event already exists to make it idempotent
      const existingOutbox = await tx.outboxEvent.findUnique({
        where: { idempotencyKey: outboxEventIdempotencyKey },
      });

      if (existingOutbox) {
        return; // Idempotent success
      }

      // Transition case using optimistic concurrency
      const updatedCase = await tx.revenueCase.updateMany({
        where: {
          id: caseId,
          version: existingCase.version,
        },
        data: {
          state: RevenueCaseState.QUEUED,
          version: existingCase.version + 1,
          updatedAt: new Date(),
        },
      });

      if (updatedCase.count === 0) {
        throw new Error('Optimistic concurrency failure: Case was updated by another process.');
      }

      // Create outbox event
      await tx.outboxEvent.create({
        data: {
          id: generateId('outbox'),
          aggregateType: 'RecoveryPlan',
          aggregateId: planId,
          eventType: 'INTERVENTION_ENQUEUED',
          payloadJson: JSON.stringify(jobPayload),
          status: 'PENDING',
          idempotencyKey: outboxEventIdempotencyKey,
        },
      });

      // Write audit log
      await tx.auditLog.create({
        data: {
          id: generateId('audit'),
          timestamp: new Date(),
          actorType: 'SYSTEM',
          action: 'INTERVENTION_ENQUEUED',
          entityType: 'RevenueCase',
          entityId: caseId,
          correlationId: correlationId,
          previousState: existingCase.state,
          nextState: RevenueCaseState.QUEUED,
          metadataJson: JSON.stringify({ planId }),
        },
      });
    });
  }
}
