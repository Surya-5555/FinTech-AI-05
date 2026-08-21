import { ExecutionRepository, PrepareInterventionCommand } from '../contracts/execution.js';
import { getPrismaClient } from '../../client/index.js';
import { generateId } from '@rr/utils';
import { RevenueCaseState } from '@rr/contracts';

export class PrismaExecutionRepository implements ExecutionRepository {
  async findInterventionByIdempotencyKey(idempotencyKey: string): Promise<any | null> {
    const prisma = getPrismaClient();
    return prisma.intervention.findUnique({
      where: { idempotencyKey },
    });
  }

  async prepareInterventionForExecution(command: PrepareInterventionCommand): Promise<any> {
    const prisma = getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      const existingCase = await tx.revenueCase.findUnique({
        where: { id: command.caseId },
      });

      if (!existingCase) {
        throw new Error(`Case ${command.caseId} not found`);
      }

      // Check idempotency again inside transaction
      const existing = await tx.intervention.findUnique({
        where: { idempotencyKey: command.idempotencyKey },
      });

      if (existing) {
        return existing;
      }

      const intervention = await tx.intervention.create({
        data: {
          id: generateId('int'),
          planId: command.planId,
          caseId: command.caseId,
          interventionType: command.interventionType,
          status: 'PENDING',
          idempotencyKey: command.idempotencyKey,
          attemptNumber: command.attemptCount,
          correlationId: existingCase.correlationId,
        },
      });

      // Transition case if necessary
      if (existingCase.state === RevenueCaseState.QUEUED) {
        const updated = await tx.revenueCase.updateMany({
          where: {
            id: command.caseId,
            version: existingCase.version,
          },
          data: {
            state: RevenueCaseState.EXECUTING,
            version: existingCase.version + 1,
            updatedAt: new Date(),
          },
        });

        if (updated.count === 0) {
          throw new Error('Optimistic concurrency failure while transitioning to EXECUTING');
        }

        // Write audit log for transition
        await tx.auditLog.create({
          data: {
            id: generateId('audit'),
            timestamp: new Date(),
            actorType: 'SYSTEM',
            action: 'STATE_TRANSITIONED',
            entityType: 'RevenueCase',
            entityId: command.caseId,
            correlationId: existingCase.correlationId,
            previousState: existingCase.state,
            nextState: RevenueCaseState.EXECUTING,
            metadataJson: JSON.stringify({ interventionId: intervention.id }),
          },
        });
      }

      // Write preparation audit log
      await tx.auditLog.create({
        data: {
          id: generateId('audit'),
          timestamp: new Date(),
          actorType: 'SYSTEM',
          action: 'INTERVENTION_PREPARED', // custom audit action mapped here
          entityType: 'Intervention',
          entityId: intervention.id,
          correlationId: existingCase.correlationId,
          metadataJson: JSON.stringify({ planId: command.planId }),
        },
      });

      return intervention;
    });
  }

  async markCaseForEscalationAfterWorkflowFailure(caseId: string, reason: string): Promise<void> {
    const prisma = getPrismaClient();

    await prisma.$transaction(async (tx) => {
      const existingCase = await tx.revenueCase.findUnique({
        where: { id: caseId },
      });

      if (!existingCase || existingCase.state === RevenueCaseState.ESCALATED || existingCase.state === RevenueCaseState.STOPPED) {
        return; // Already terminal or not found
      }

      const updated = await tx.revenueCase.updateMany({
        where: {
          id: caseId,
          version: existingCase.version,
        },
        data: {
          state: RevenueCaseState.ESCALATED,
          version: existingCase.version + 1,
          updatedAt: new Date(),
        },
      });

      if (updated.count > 0) {
        await tx.auditLog.create({
          data: {
            id: generateId('audit'),
            timestamp: new Date(),
            actorType: 'SYSTEM',
            action: 'CASE_ESCALATED',
            entityType: 'RevenueCase',
            entityId: caseId,
            correlationId: existingCase.correlationId,
            previousState: existingCase.state,
            nextState: RevenueCaseState.ESCALATED,
            metadataJson: JSON.stringify({ reason }),
          },
        });
      }
    });
  }

  async markCaseForStopAfterWorkflowFailure(caseId: string, reason: string): Promise<void> {
    const prisma = getPrismaClient();

    await prisma.$transaction(async (tx) => {
      const existingCase = await tx.revenueCase.findUnique({
        where: { id: caseId },
      });

      if (!existingCase || existingCase.state === RevenueCaseState.ESCALATED || existingCase.state === RevenueCaseState.STOPPED) {
        return; // Already terminal or not found
      }

      const updated = await tx.revenueCase.updateMany({
        where: {
          id: caseId,
          version: existingCase.version,
        },
        data: {
          state: RevenueCaseState.STOPPED,
          version: existingCase.version + 1,
          updatedAt: new Date(),
        },
      });

      if (updated.count > 0) {
        await tx.auditLog.create({
          data: {
            id: generateId('audit'),
            timestamp: new Date(),
            actorType: 'SYSTEM',
            action: 'CASE_STOPPED',
            entityType: 'RevenueCase',
            entityId: caseId,
            correlationId: existingCase.correlationId,
            previousState: existingCase.state,
            nextState: RevenueCaseState.STOPPED,
            metadataJson: JSON.stringify({ reason }),
          },
        });
      }
    });
  }
}
