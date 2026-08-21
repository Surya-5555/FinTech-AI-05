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

  async claimExecutionLock(interventionId: string, workerId: string): Promise<boolean> {
    const prisma = getPrismaClient();
    try {
      const updated = await prisma.intervention.updateMany({
        where: {
          id: interventionId,
          lockedBy: null, // Only lock if not currently locked
        },
        data: {
          lockedAt: new Date(),
          lockedBy: workerId,
        },
      });
      return updated.count > 0;
    } catch {
      return false;
    }
  }

  async persistExecutionResult(result: any, resultingCaseState: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.$transaction(async (tx) => {
      const intervention = await tx.intervention.findUnique({
        where: { id: result.interventionId },
      });
      
      if (!intervention) throw new Error(`Intervention ${result.interventionId} not found`);

      // 1. Update Intervention Outcome
      await tx.interventionOutcome.create({
        data: {
          id: generateId('outcome'),
          interventionId: result.interventionId,
          status: result.status,
          recoveredAmountMinor: result.recoveredAmount?.amountMinor || null,
          currency: result.recoveredAmount?.currency || null,
          resultMetadataJson: JSON.stringify({ failureCode: result.failureCode, externalReference: result.externalReference }),
        },
      });

      // 2. Update Intervention status
      await tx.intervention.update({
        where: { id: result.interventionId },
        data: {
          status: result.status,
          executionCompletedAt: result.executedAt,
          externalReference: result.externalReference,
          failureCode: result.failureCode,
          retryAfter: result.retryAfter,
        }
      });

      // 3. Update Case State
      const existingCase = await tx.revenueCase.findUnique({
        where: { id: intervention.caseId },
      });

      if (existingCase && existingCase.state !== resultingCaseState) {
        await tx.revenueCase.updateMany({
          where: {
            id: existingCase.id,
            version: existingCase.version,
          },
          data: {
            state: resultingCaseState,
            version: existingCase.version + 1,
            updatedAt: new Date(),
          }
        });

        await tx.auditLog.create({
          data: {
            id: generateId('audit'),
            timestamp: new Date(),
            actorType: 'SYSTEM',
            action: 'STATE_TRANSITIONED',
            entityType: 'RevenueCase',
            entityId: existingCase.id,
            correlationId: existingCase.correlationId,
            previousState: existingCase.state,
            nextState: resultingCaseState,
            metadataJson: JSON.stringify({ interventionId: result.interventionId }),
          },
        });
      }
    });
  }

  async scheduleRetry(interventionId: string, delayMs: number): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.$transaction(async (tx) => {
      const intervention = await tx.intervention.findUnique({ where: { id: interventionId } });
      if (!intervention) return;
      
      // Update Intervention state
      await tx.intervention.update({
        where: { id: interventionId },
        data: {
          status: 'RETRY_SCHEDULED',
          retryAfter: new Date(Date.now() + delayMs),
        }
      });

      // Update case to RETRYABLE
      const existingCase = await tx.revenueCase.findUnique({ where: { id: intervention.caseId } });
      if (existingCase && existingCase.state !== RevenueCaseState.RETRYABLE) {
         await tx.revenueCase.updateMany({
           where: { id: existingCase.id, version: existingCase.version },
           data: { state: RevenueCaseState.RETRYABLE, version: existingCase.version + 1, updatedAt: new Date() }
         });
      }
    });
  }

  async blockExecution(interventionId: string, reason: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        status: 'STOPPED',
        failureCode: 'POLICY_BLOCKED',
      }
    });
  }
}
