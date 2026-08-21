import { LLMClient, LLMProviderHealth, StructuredGenerationRequest, LLMGenerationResult } from './llm.client.js';
import { AIInvocationStatus, AIInvocationRecord, AIUseCase } from '@rr/contracts';
import { generateId } from '@rr/utils';

export class DisabledLLMClient implements LLMClient {
  async generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<LLMGenerationResult<T>> {
    const record: AIInvocationRecord = {
      id: generateId('ai'),
      useCase: request.context.useCase as AIUseCase,
      promptVersion: 'unknown',
      inputHash: 'disabled',
      status: AIInvocationStatus.DISABLED,
      correlationId: request.context.correlationId,
      createdAt: new Date(),
    };

    return {
      record,
      isFallback: true,
    };
  }

  async healthCheck(): Promise<LLMProviderHealth> {
    return {
      enabled: false,
      providerName: 'DISABLED',
      modelName: 'NONE',
      ready: true,
    };
  }
}
