import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getPrismaClient } from '@rr/persistence';
import { PlanningService } from '../planning/planning.service';
import { RevenueCaseState } from '@rr/contracts';

@Injectable()
export class CaseOrchestratorService {
  private readonly logger = new Logger(CaseOrchestratorService.name);
  private isProcessing = false;

  constructor(
    private readonly planningService: PlanningService
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCron() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const prisma = getPrismaClient();
      
      const casesToProcess = await prisma.revenueCase.findMany({
        where: {
          state: { in: [RevenueCaseState.DETECTED, RevenueCaseState.RETRYABLE] },
        },
        take: 20,
        orderBy: { createdAt: 'asc' },
      });

      if (casesToProcess.length > 0) {
        this.logger.log(`Orchestrating ${casesToProcess.length} pending cases...`);
      }

      for (const revCase of casesToProcess) {
        try {
          const merchant = await prisma.merchant.findUnique({
            where: { id: revCase.merchantId }
          });
          
          if (!merchant || !merchant.configJson) {
            this.logger.warn(`No policy found for merchant ${revCase.merchantId}, skipping case ${revCase.id}`);
            continue;
          }

          const policy = JSON.parse(merchant.configJson);

          const planResponse = await this.planningService.createPlan(
            revCase.id, 
            policy.policyVersion, 
            revCase.correlationId
          );
          
          if (planResponse.resultingCaseState === RevenueCaseState.POLICY_CHECKED && !planResponse.policyDecision.requiresHumanApproval) {
            await this.planningService.enqueuePlan(
              revCase.id, 
              planResponse.plan.planId, 
              revCase.correlationId
            );
            this.logger.log(`Successfully orchestrated and enqueued plan for case ${revCase.id}`);
          } else {
            this.logger.log(`Case ${revCase.id} resulted in state ${planResponse.resultingCaseState} (No immediate enqueue)`);
          }
        } catch (err: any) {
          this.logger.error(`Failed to orchestrate case ${revCase.id}`, err.stack);
        }
      }
    } catch (error: any) {
      this.logger.error('Error during orchestration loop', error.stack);
    } finally {
      this.isProcessing = false;
    }
  }
}
