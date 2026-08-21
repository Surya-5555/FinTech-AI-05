import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ExecutionRepository, PlanningRepository } from '@rr/persistence';
import { RecoveryPlanExecutionJob, InterventionExecutionResult, RevenueCaseState, InterventionExecutionRequest } from '@rr/contracts';
import { proposeRecoveryPlan } from '@rr/domain';
import { ProviderFactory } from '../providers/provider.factory.js';
import { randomUUID } from 'crypto';

@Processor('recovery-plan-execution', {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
})
export class RecoveryPlanExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(RecoveryPlanExecutionProcessor.name);
  private readonly workerId = randomUUID();

  constructor(
    @Inject('ExecutionRepository')
    private readonly executionRepo: ExecutionRepository,
    @Inject('PlanningRepository')
    private readonly planningRepo: PlanningRepository,
    private readonly providerFactory: ProviderFactory,
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

      if (revCase.state !== RevenueCaseState.QUEUED) {
        if (revCase.state !== RevenueCaseState.EXECUTING) {
          this.logger.warn(`Case ${revCase.caseId} is not QUEUED or EXECUTING, currently ${revCase.state}`);
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

      // E. Execution Phase
      // 1. Claim Lock
      const lockAcquired = await this.executionRepo.claimExecutionLock(intervention.id, this.workerId);
      if (!lockAcquired) {
        this.logger.warn(`Could not acquire execution lock for intervention ${intervention.id}`);
        return { result: 'DISCARDED', reason: 'CONCURRENT_EXECUTION' };
      }

      // 2. Map InterventionType to ExecutionActionType
      let actionType = plan.interventionType as any;
      if (plan.interventionType === 'PAYMENT_LINK') actionType = 'CREATE_PAYMENT_LINK';
      if (plan.interventionType === 'PAYMENT_RETRY') actionType = 'INITIATE_PAYMENT_RETRY';
      if (plan.interventionType === 'EMAIL_REMINDER') actionType = 'SEND_EMAIL_REMINDER';
      if (plan.interventionType === 'SMS_REMINDER') actionType = 'SEND_SMS_REMINDER';
      if (plan.interventionType === 'VOICE_REMINDER') actionType = 'SEND_VOICE_REMINDER';
      if (plan.interventionType === 'HUMAN_ESCALATION') actionType = 'CREATE_HUMAN_ESCALATION';

      // 3. Select Provider
      const provider = this.providerFactory.getProvider(actionType);
      
      const executionRequest: InterventionExecutionRequest = {
        interventionId: intervention.id as any,
        caseId: payload.caseId as any,
        merchantId: payload.merchantId as any,
        actionType,
        amountMinor: BigInt(revCase.amountAtRisk.amountMinor),
        currency: revCase.amountAtRisk.currency,
        parameters: {
          customerName: sourceEvent.payload.customerName,
          customerEmail: sourceEvent.payload.customerEmail,
          customerPhone: sourceEvent.payload.customerPhone,
        },
        idempotencyKey: interventionIdempotencyKey as any,
      };

      // 4. Execute Action
      this.logger.log(`Executing ${actionType} via provider...`);
      const providerResult = await provider.execute(executionRequest);
      
      // 5. Map Result
      const executionResult: InterventionExecutionResult = {
        interventionId: intervention.id as any,
        status: providerResult.success ? 'SUCCEEDED' : 'FAILED',
        executedAt: new Date(),
      };
      if (providerResult.recoveredAmount) executionResult.recoveredAmount = providerResult.recoveredAmount;
      if (providerResult.externalReference) executionResult.externalReference = providerResult.externalReference;
      if (providerResult.failureCode) executionResult.failureCode = providerResult.failureCode;
      if (providerResult.retryAfter) executionResult.retryAfter = providerResult.retryAfter;

      // Map intervention outcome to case state
      let nextCaseState = RevenueCaseState.RECOVERED; // Simplified
      if (executionResult.status === 'SUCCEEDED') {
        if (actionType === 'CREATE_PAYMENT_LINK' || actionType.startsWith('SEND_')) {
          nextCaseState = RevenueCaseState.AWAITING_CUSTOMER_ACTION;
        } else if (actionType === 'INITIATE_PAYMENT_RETRY') {
          // In real life, might be AWAITING_GATEWAY_RESPONSE, but assuming synchronous here
          nextCaseState = executionResult.recoveredAmount ? RevenueCaseState.RECOVERED : RevenueCaseState.FAILED; 
        }
      } else {
         nextCaseState = RevenueCaseState.FAILED;
      }

      // 6. Persist Atomic Outcome
      await this.executionRepo.persistExecutionResult(executionResult, nextCaseState);

      this.logger.log(`Execution completed with status ${executionResult.status}, case is now ${nextCaseState}`);
      return { result: 'EXECUTED', status: executionResult.status, interventionId: intervention.id };
    } catch (error: any) {
      this.logger.error(`Error processing job ${job.id}:`, error.stack);
      
      // F. Invalid or unsafe conditions
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
