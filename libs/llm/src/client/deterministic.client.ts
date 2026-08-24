import { LLMClient, LLMProviderHealth, StructuredGenerationRequest, LLMGenerationResult } from './llm.client';
import { AIInvocationStatus, AIInvocationRecord, AIUseCase } from '@rr/contracts';
import { generateId } from '@rr/utils';
import { createHash } from 'crypto';

export class DeterministicLLMClient implements LLMClient {
  private simulateDelay: number;
  private shouldFail: boolean;

  constructor(options: { simulateDelayMs?: number; shouldFail?: boolean } = {}) {
    this.simulateDelay = options.simulateDelayMs || 0;
    this.shouldFail = options.shouldFail || false;
  }

  async generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<LLMGenerationResult<T>> {
    const startTime = Date.now();
    const inputString = request.systemPrompt + request.userPrompt;
    const inputHash = createHash('sha256').update(inputString).digest('hex').substring(0, 16);
    
    if (this.simulateDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulateDelay));
    }

    const record: AIInvocationRecord = {
      id: generateId('ai'),
      useCase: request.context.useCase as AIUseCase,
      providerName: 'OFFLINE_DETERMINISTIC_PROVIDER',
      modelName: 'DETERMINISTIC_EVAL_MODEL',
      promptVersion: 'v1',
      inputHash,
      status: this.shouldFail ? AIInvocationStatus.PROVIDER_ERROR : AIInvocationStatus.SUCCEEDED,
      latencyMs: Date.now() - startTime,
      estimatedCostMinor: 0,
      correlationId: request.context.correlationId,
      createdAt: new Date(),
    };

    if (this.shouldFail) {
      return {
        record,
        isFallback: true,
      };
    }

    let deterministicData: any = {};
    if (request.context.useCase === AIUseCase.RECOVERY_MESSAGE_DRAFT) {
      deterministicData = {
        text: `Automated deterministic message for ${request.context.amountDisplay}`,
        locale: request.context.locale,
        channel: request.context.channel,
        templateVersion: 'v1',
        safetyChecks: {
          passed: true,
          issues: []
        },
        source: 'LLM'
      };
    } else if (request.context.useCase === AIUseCase.RECOVERY_DECISION_EXPLANATION) {
      deterministicData = {
        summary: `Deterministic evaluation explanation for ${request.context.failureReason}`,
        bulletReasons: ['Reason 1', 'Reason 2'],
        policyBoundaryStatement: 'Deterministic statement',
        source: 'LLM'
      };
    }

    const outputHash = createHash('sha256').update(JSON.stringify(deterministicData)).digest('hex').substring(0, 16);
    record.outputHash = outputHash;

    return {
      data: deterministicData as T,
      record,
      rawResponse: JSON.stringify(deterministicData),
      isFallback: false,
    };
  }

  async healthCheck(): Promise<LLMProviderHealth> {
    return {
      enabled: true,
      providerName: 'OFFLINE_DETERMINISTIC_PROVIDER',
      modelName: 'DETERMINISTIC_EVAL_MODEL',
      ready: true,
    };
  }
}
