import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PlanningRepository } from '@rr/persistence';
import { proposeRecoveryPlan } from '@rr/domain';
import { PlanDecisionResponse } from '@rr/contracts';
import { randomUUID } from 'crypto';

@Injectable()
export class PlanningService {
  constructor(
    @Inject('PlanningRepository')
    private readonly planningRepo: PlanningRepository
  ) {}

  async createPlan(caseId: string, policyVersion: string, correlationId?: string): Promise<PlanDecisionResponse> {
    const data = await this.planningRepo.getCaseWithSourceEventAndMerchantPolicy(caseId);
    if (!data) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    const { revCase, sourceEvent, merchantPolicy } = data;

    if (!merchantPolicy) {
      throw new ConflictException(`Merchant ${revCase.merchantId} has no policy config`);
    }

    if (merchantPolicy.policyVersion !== policyVersion) {
      throw new ConflictException(`Requested policy version ${policyVersion} does not match effective merchant policy ${merchantPolicy.policyVersion}`);
    }

    const activeInterventionSummary = await this.planningRepo.getActiveInterventionSummary(caseId);

    const now = new Date();

    try {
      const proposal = await proposeRecoveryPlan({
        revCase,
        sourceEvent,
        merchantPolicy,
        activeInterventionSummary,
        now,
      });

      // 4. Persist
      const persistedPlan = await this.planningRepo.createPlanWithPlanningOutcome({
        plan: proposal.plan,
        resultingCaseState: proposal.resultingCaseState,
      });

      return {
        caseId: revCase.caseId,
        plan: persistedPlan,
        diagnosis: proposal.diagnosis,
        policyDecision: proposal.policyDecision,
        resultingCaseState: proposal.resultingCaseState,
        idempotentReplay: persistedPlan.planId !== proposal.plan.planId, // If the persisted plan ID is different from what we generated, it was a replay
        correlationId: correlationId || revCase.correlationId,
      };
    } catch (e: any) {
      throw new ConflictException(e.message);
    }
  }

  async listPlans(caseId: string) {
    return this.planningRepo.listPlansForCase(caseId);
  }

  async enqueuePlan(caseId: string, planId: string, correlationId?: string) {
    const data = await this.planningRepo.getCaseWithSourceEventAndMerchantPolicy(caseId);
    if (!data) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    const { revCase, merchantPolicy } = data;
    const plans = await this.listPlans(caseId);
    const plan = plans.find(p => p.planId === planId);

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }

    if (plan.planStatus !== 'POLICY_APPROVED') {
      throw new ConflictException('Plan must be POLICY_APPROVED to enqueue');
    }

    if (plan.requiresHumanApproval) {
      throw new ConflictException('Plan requires human approval');
    }

    if (revCase.state !== 'POLICY_CHECKED') {
      throw new ConflictException(`Case is in state ${revCase.state}, expected POLICY_CHECKED`);
    }

    // Determine deterministic idempotency key for the outbox event
    const outboxIdempotencyKey = `${plan.planId}-enqueue`;
    const corrId = correlationId || revCase.correlationId;

    const jobPayload = {
      jobVersion: '1.0',
      jobId: outboxIdempotencyKey,
      planId: plan.planId,
      caseId: plan.caseId,
      merchantId: revCase.merchantId,
      correlationId: corrId,
      planIdempotencyKey: plan.idempotencyKey,
      requestedAt: new Date(),
      attempt: 1,
    };

    await this.planningRepo.enqueuePlanWithOutbox(
      caseId,
      planId,
      outboxIdempotencyKey,
      jobPayload,
      corrId
    );

    return { success: true, message: 'Plan enqueued successfully', jobId: outboxIdempotencyKey };
  }
}
