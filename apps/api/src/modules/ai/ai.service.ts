import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DraftRequestDto } from './dto/draft-request.dto';
import { 
  AIRequestContext, 
  AIUseCase, 
  AILocale, 
  AIDataClassification, 
  RecoveryMessageDraft,
  DecisionExplanation
} from '@rr/contracts';
import { 
  getFallbackMessageDraft,
  getFallbackDecisionExplanation,
} from '@rr/llm';
import { generateId } from '@rr/utils';
import { AIInvocationRepository } from '@rr/persistence';
import { CorrelationId } from '@rr/contracts';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly prisma = new PrismaClient();
  private readonly aiRepo = new AIInvocationRepository(this.prisma);

  // For this buildathon, we simply use fallbacks as requested if no LLM configured 
  // or preferLLM is false. True LLM integration can be injected via module providers.

  async getMessageDraft(caseId: string, dto: DraftRequestDto): Promise<RecoveryMessageDraft> {
    const revenueCase = await this.prisma.revenueCase.findUnique({
      where: { id: caseId },
    });

    if (!revenueCase) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    // In a real flow, we check if plan exists in POLICY_APPROVED
    // For now we build the deterministic context
    const context: AIRequestContext = {
      requestId: generateId('req'),
      correlationId: revenueCase.correlationId as CorrelationId,
      useCase: AIUseCase.RECOVERY_MESSAGE_DRAFT,
      locale: dto.locale || AILocale.EN_IN,
      merchantDisplayName: 'Razorpay Merchant', // In real, fetch from Merchant repo
      maskedCustomerReference: 'CUST-XXXX',
      amountDisplay: `${revenueCase.currency} ${Number(revenueCase.amountAtRiskMinor) / 100}`,
      currency: revenueCase.currency,
      eventType: 'PAYMENT_FAILED',
      failureReason: revenueCase.rootCause || 'insufficient_funds',
      rootCause: revenueCase.rootCause || 'insufficient_funds',
      interventionType: 'SEND_SMS_REMINDER',
      policyReasonCodes: ['RISK_LOW'],
      maxAttemptsRemaining: 3,
      channel: dto.channel,
      constraints: {
        maxCharacters: 160,
        forbiddenClaims: ['guarantee', 'legal action'],
        allowedTone: 'professional',
      },
      dataClassification: AIDataClassification.MASKED_DEMO,
    };

    // We use fallback directly for safety/speed unless LLM client is wired
    const draft = getFallbackMessageDraft(context);
    
    // Telemetry
    await this.aiRepo.recordAIInvocation({
      id: generateId('ai'),
      useCase: AIUseCase.RECOVERY_MESSAGE_DRAFT,
      providerName: 'FALLBACK',
      modelName: 'FALLBACK',
      promptVersion: 'fallback-v1',
      inputHash: 'none',
      status: 'FALLBACK_USED' as any,
      correlationId: context.correlationId,
      createdAt: new Date(),
    }, { caseId });

    return draft;
  }

  async getDecisionExplanation(caseId: string): Promise<DecisionExplanation> {
    const revenueCase = await this.prisma.revenueCase.findUnique({
      where: { id: caseId },
    });

    if (!revenueCase) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    const context: AIRequestContext = {
      requestId: generateId('req'),
      correlationId: revenueCase.correlationId as CorrelationId,
      useCase: AIUseCase.RECOVERY_DECISION_EXPLANATION,
      locale: AILocale.EN_IN,
      merchantDisplayName: 'Razorpay Merchant',
      maskedCustomerReference: 'CUST-XXXX',
      amountDisplay: `${revenueCase.currency} ${Number(revenueCase.amountAtRiskMinor) / 100}`,
      currency: revenueCase.currency,
      eventType: 'PAYMENT_FAILED',
      failureReason: revenueCase.rootCause || 'insufficient_funds',
      rootCause: revenueCase.rootCause || 'insufficient_funds',
      interventionType: 'SEND_SMS_REMINDER',
      policyReasonCodes: ['RISK_LOW'],
      maxAttemptsRemaining: 3,
      channel: 'NONE',
      constraints: {
        maxCharacters: 500,
        forbiddenClaims: [],
        allowedTone: 'analytical',
      },
      dataClassification: AIDataClassification.MASKED_DEMO,
    };

    const explanation = getFallbackDecisionExplanation(context);

    // Telemetry
    await this.aiRepo.recordAIInvocation({
      id: generateId('ai'),
      useCase: AIUseCase.RECOVERY_DECISION_EXPLANATION,
      providerName: 'FALLBACK',
      modelName: 'FALLBACK',
      promptVersion: 'fallback-v1',
      inputHash: 'none',
      status: 'FALLBACK_USED' as any,
      correlationId: context.correlationId,
      createdAt: new Date(),
    }, { caseId });

    return explanation;
  }

  async getHealth() {
    return {
      enabled: false,
      providerName: 'FALLBACK',
      modelName: 'NONE',
      ready: true,
    };
  }
}
