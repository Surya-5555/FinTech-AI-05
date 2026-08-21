import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ExecutionRepository, PlanningRepository } from '@rr/persistence';
import { RecoveryPlanExecutionJob } from '@rr/contracts';
import { proposeRecoveryPlan } from '@rr/domain';

@Processor('recovery-plan-execution', {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
})
export class RecoveryPlanExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(RecoveryPlanExecutionProcessor.name);

  constructor(
    @Inject('ExecutionRepository')
    private readonly executionRepo: ExecutionRepository,
    @Inject('PlanningRepository')
    private readonly planningRepo: PlanningRepository,
  ) {
    super();
  }

  async process(job: Job<RecoveryPlanExecutionJob, any, string>): Promise<any> {
    const payload = job.data;
    this.logger.log(`Processing execution job for case ${payload.caseId} plan ${payload.planId}`);

    try {
      // A. Re-read state from Postgres
      const data = await this.planningRepo.getCaseWithSourceEventAndMerchantPolicy(payload.caseId);
      if (!data) {
        this.logger.warn(`Case ${payload.caseId} not found, discarding job`);
        return { result: 'DISCARDED', reason: 'CASE_NOT_FOUND' };
      }

      const { revCase, sourceEvent, merchantPolicy } = data;
      
      const plans = await this.planningRepo.listPlansForCase(payload.caseId);
      const plan = plans.find(p => p.planId === payload.planId);

      if (!plan) {
        this.logger.warn(`Plan ${payload.planId} not found, discarding job`);
        return { result: 'DISCARDED', reason: 'PLAN_NOT_FOUND' };
      }

      // B. Validate
      if (plan.planStatus !== 'POLICY_APPROVED' || plan.requiresHumanApproval) {
        this.logger.warn(`Plan ${plan.planId} is not approved or requires human approval, discarding job`);
        return { result: 'DISCARDED', reason: 'PLAN_NOT_APPROVED' };
      }

      if (revCase.state !== 'QUEUED') {
        this.logger.warn(`Case ${revCase.caseId} is not QUEUED, currently ${revCase.state}`);
        // If it's already EXECUTING, might be a retry, but in phase 3.1 we just stop external.
        if (revCase.state !== 'EXECUTING') {
          return { result: 'DISCARDED', reason: 'INVALID_CASE_STATE' };
        }
      }

      // Re-evaluate policy to ensure it's still valid
      const activeInterventionSummary = await this.planningRepo.getActiveInterventionSummary(payload.caseId);
      const proposal = proposeRecoveryPlan({
        revCase,
        sourceEvent,
        merchantPolicy,
        activeInterventionSummary,
        now: new Date(),
      });

      if (proposal.plan.planStatus !== 'POLICY_APPROVED') {
        this.logger.warn(`Policy re-evaluation rejected plan ${plan.planId}`);
        await this.executionRepo.markCaseForStopAfterWorkflowFailure(
          payload.caseId, 
          'Policy re-evaluation rejected intervention'
        );
        return { result: 'STOPPED', reason: 'POLICY_REJECTED_ON_REVALUATION' };
      }

      if (proposal.plan.interventionType !== plan.interventionType) {
        this.logger.warn(`Policy re-evaluation recommended a different intervention, stopping workflow`);
        await this.executionRepo.markCaseForStopAfterWorkflowFailure(
          payload.caseId, 
          'Policy recommended different intervention'
        );
        return { result: 'STOPPED', reason: 'INTERVENTION_MISMATCH' };
      }

      // C. Idempotency Key for Intervention
      const interventionIdempotencyKey = `${plan.planId}-${plan.interventionType}-${payload.attempt}`;

      // D. Persist prepared intervention transactionally
      const intervention = await this.executionRepo.prepareInterventionForExecution({
        planId: plan.planId,
        caseId: plan.caseId,
        merchantId: payload.merchantId,
        interventionType: plan.interventionType,
        idempotencyKey: interventionIdempotencyKey,
        attemptCount: payload.attempt,
      });

      this.logger.log(`Intervention prepared for execution: ${intervention.id}`);

      return { result: 'PREPARED_FOR_EXECUTION', interventionId: intervention.id };
    } catch (error: any) {
      this.logger.error(`Error processing job ${job.id}:`, error.stack);
      
      // E. Invalid or unsafe conditions
      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        // Exhausted
        await this.executionRepo.markCaseForEscalationAfterWorkflowFailure(
          payload.caseId,
          `Workflow exhausted after ${job.attemptsMade + 1} attempts: ${error.message}`
        );
        this.logger.error(`Workflow exhausted, escalated case ${payload.caseId}`);
      }

      throw error; // Let BullMQ handle retry if attempts remain
    }
  }
}
