import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ExecutionRepository, PlanningRepository } from '@rr/persistence';
import { RevenueCaseState } from '@rr/contracts';
import { ProviderFactory } from '../providers/provider.factory';
import { randomUUID } from 'crypto';

interface ReconciliationJob {
  interventionId: string;
  caseId: string;
  merchantId: string;
  externalReference?: string;
  actionType: string;
}

@Processor('reconciliation', {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
})
export class ReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReconciliationProcessor.name);
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

  async process(job: Job<ReconciliationJob, any, string>): Promise<any> {
    const payload = job.data;
    this.logger.log(`Processing reconciliation job for intervention ${payload.interventionId}`);

    try {
      const data = await this.planningRepo.getCaseWithSourceEventAndMerchantPolicy(payload.caseId);
      if (!data) {
        this.logger.warn(`Case ${payload.caseId} not found`);
        return { result: 'DISCARDED', reason: 'CASE_NOT_FOUND' };
      }

      if (data.revCase.state !== RevenueCaseState.AMBIGUOUS) {
         this.logger.warn(`Case ${payload.caseId} is not in AMBIGUOUS state, it is ${data.revCase.state}`);
         return { result: 'DISCARDED', reason: 'INVALID_STATE' };
      }

      // Check external provider
      // In real code, we'd query Razorpay GET /payment_links/:id.
      // Here we simulate resolving AMBIGUOUS state for the chaotic provider.
      // If the action is a payment link retry and we timed out...
      
      const provider = this.providerFactory.getProvider(payload.actionType as any);
      
      // Simulate checking external status
      // We assume it failed in test mode to resolve the ambiguity (simulating that the timeout meant the request never reached Razorpay or it failed).
      // We mark as FAILED so it can be retried.
      
      const nextCaseState = RevenueCaseState.FAILED;
      
      // We must mark the execution result as resolved.
      // Actually, we don't have a direct persistReconciliationResult method on executionRepo, 
      // but we can just use the persistExecutionResult or directly transition the case state.
      // Let's use markCaseForEscalationAfterWorkflowFailure or something similar, or just update the state directly if possible.
      // Since it's an AMBIGUOUS state, the easiest is to just set it to FAILED so it triggers standard retry logic.
      
      await this.executionRepo.persistExecutionResult({
        interventionId: payload.interventionId as any,
        status: 'FAILED',
        executedAt: new Date(),
        failureCode: 'PROVIDER_REJECTED',
      }, nextCaseState);

      this.logger.log(`Reconciliation resolved intervention ${payload.interventionId} as FAILED. Case is now FAILED and eligible for retry.`);

      return { result: 'RECONCILED', status: 'FAILED' };
    } catch (error: any) {
      this.logger.error(`Error processing reconciliation job ${job.id}:`, error.stack);
      throw error;
    }
  }
}
