import { RecoveryCase, RecoveryPlan, RevenueCaseState, RecoveryPlanId } from '@rr/contracts';

export interface CreatePlanCommand {
  plan: RecoveryPlan;
  resultingCaseState: RevenueCaseState;
}

export interface PlanningRepository {
  createPlanWithPlanningOutcome(command: CreatePlanCommand): Promise<RecoveryPlan>;
  listPlansForCase(caseId: string): Promise<RecoveryPlan[]>;
  findPlanByIdempotencyKey(idempotencyKey: string): Promise<RecoveryPlan | null>;
  getCaseWithSourceEventAndMerchantPolicy(caseId: string): Promise<any>; // define specific type in implementation
  getActiveInterventionSummary(caseId: string): Promise<any>;
  enqueuePlanWithOutbox(caseId: string, planId: string, outboxEventIdempotencyKey: string, jobPayload: any, correlationId: string): Promise<void>;
}
