import { Controller, Post, Body, Headers, HttpCode, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { getPrismaClient } from '@rr/persistence';
import { RevenueCaseState } from '@rr/contracts';

@Controller('razorpay')
export class RazorpayController {
  private readonly logger = new Logger(RazorpayController.name);

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string
  ) {
    const eventType = payload?.event;
    if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
      return { status: 'IGNORED', reason: 'UNSUPPORTED_EVENT_TYPE' };
    }

    const entity = payload?.payload?.payment?.entity || payload?.payload?.order?.entity;
    if (!entity) {
      throw new BadRequestException('Malformed Razorpay webhook payload');
    }

    const caseId = entity.notes?.caseId;
    if (!caseId) {
       this.logger.warn(`Webhook received but no caseId found in notes: ${entity.id}`);
       return { status: 'IGNORED', reason: 'NO_CASE_ID_IN_NOTES' };
    }

    const prisma = getPrismaClient();

    const revCase = await prisma.revenueCase.findUnique({
      where: { id: caseId }
    });

    if (!revCase) {
      this.logger.warn(`Case ${caseId} not found for payment webhook`);
      return { status: 'IGNORED', reason: 'CASE_NOT_FOUND' };
    }

    if (revCase.state === RevenueCaseState.RECOVERED || revCase.state === RevenueCaseState.FAILED || revCase.state === RevenueCaseState.STOPPED) {
      this.logger.log(`Case ${caseId} is already in a terminal state: ${revCase.state}`);
      return { status: 'SUCCESS', result: 'ALREADY_TERMINAL' };
    }

    this.logger.log(`Applying in-flight payment for case ${caseId} at version ${revCase.version}`);
    
    try {
      const updatedCase = await prisma.revenueCase.updateMany({
        where: { 
          id: caseId, 
          version: revCase.version // Strict OCC check for race conditions
        },
        data: { 
          state: RevenueCaseState.RECOVERED,
          version: { increment: 1 },
          updatedAt: new Date()
        }
      });

      if (updatedCase.count === 0) {
        this.logger.warn(`Concurrency conflict updating case ${caseId} for payment.captured. Version drifted.`);
        throw new BadRequestException('ConcurrencyConflictError'); // Throwing triggers BullMQ/Webhook retry if configured
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

      this.logger.log(`Successfully processed in-flight payment for case ${caseId}`);
      return { status: 'SUCCESS' };
    } catch (error: any) {
       this.logger.error(`Error processing webhook for case ${caseId}`, error);
       throw error;
    }
  }
}
