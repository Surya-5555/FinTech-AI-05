import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { getPrismaClient } from '@rr/persistence';
import { RevenueCaseState } from '@rr/contracts';
import { PlanningService } from '../planning/planning.service';

@Processor('razorpay-events')
export class RazorpayEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(RazorpayEventsProcessor.name);

  constructor(private readonly planningService: PlanningService) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing async razorpay webhook: ${eventId}`);

    const eventType = payload?.event;
    const entity = payload?.payload?.payment?.entity || payload?.payload?.order?.entity;
    
    // In Track 3, we expect custom notes to carry the caseId
    if (!entity || !entity.notes?.caseId) {
      this.logger.warn(`Invalid payload or missing caseId in job ${job.id}`);
      return { status: 'IGNORED', reason: 'MISSING_CASE_ID' };
    }

    const caseId = entity.notes.caseId;
    const prisma = getPrismaClient();

    try {
      const revCase = await prisma.revenueCase.findUnique({
        where: { id: caseId }
      });

      if (!revCase) {
        this.logger.warn(`Case ${caseId} not found`);
        return { status: 'IGNORED', reason: 'CASE_NOT_FOUND' };
      }

      // Handle successful capture or paid orders
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        if (
          revCase.state === RevenueCaseState.RECOVERED || 
          revCase.state === RevenueCaseState.FAILED || 
          revCase.state === RevenueCaseState.STOPPED
        ) {
          return { status: 'SUCCESS', result: 'ALREADY_TERMINAL' };
        }

        // Apply strict optimistic concurrency control (OCC)
        const updatedCase = await prisma.revenueCase.updateMany({
          where: { 
            id: caseId, 
            version: revCase.version
          },
          data: { 
            state: RevenueCaseState.RECOVERED,
            version: { increment: 1 },
            updatedAt: new Date()
          }
        });

        if (updatedCase.count === 0) {
          throw new Error(`ConcurrencyConflictError: Version mismatch for case ${caseId}`);
        }
        
        await prisma.auditLog.create({
          data: {
            entityType: 'REVENUE_CASE',
            entityId: caseId,
            action: 'PAYMENT_CAPTURED_WEBHOOK',
            actorType: 'SYSTEM',
            metadataJson: JSON.stringify({ eventType, amount: entity.amount, originalVersion: revCase.version }),
            correlationId: revCase.correlationId,
            previousState: revCase.state,
            nextState: RevenueCaseState.RECOVERED,
            timestamp: new Date()
          }
        });

        this.logger.log(`Successfully processed payment capture for case ${caseId}`);

      } 
      // Handle failures via AI orchestration
      else if (eventType === 'payment.failed') {
        this.logger.log(`Payment failed for case ${caseId}, triggering AI dunning workflow.`);
        
        const merchant = await prisma.merchant.findUnique({ 
          where: { id: revCase.merchantId }
        });
        
        const config = merchant?.configJson ? JSON.parse(merchant.configJson) : {};
        const policyVersion = config.policyVersion || '1.0';
        
        // This invokes the LangGraph state machine underneath
        await this.planningService.createPlan(caseId, policyVersion, revCase.correlationId);
        
        this.logger.log(`Successfully invoked AI planner for failed payment on case ${caseId}`);
      }

      return { status: 'SUCCESS' };
      
    } catch (error: any) {
      this.logger.error(`Error processing webhook job ${job.id} for case ${caseId}: ${error.message}`, error.stack);
       
      await prisma.auditLog.create({
         data: {
            entityType: 'REVENUE_CASE',
            entityId: caseId,
            action: 'WEBHOOK_PROCESSING_FAILED',
            actorType: 'SYSTEM',
            metadataJson: JSON.stringify({ error: error.message, stack: error.stack }),
            correlationId: 'unknown',
            previousState: 'UNKNOWN',
            nextState: 'UNKNOWN',
            timestamp: new Date()
         }
      }).catch(e => this.logger.error('Failed to write audit log on error', e));
       
      // Throwing the error ensures BullMQ marks the job as failed and triggers localized retry
      throw error;
    }
  }
}
