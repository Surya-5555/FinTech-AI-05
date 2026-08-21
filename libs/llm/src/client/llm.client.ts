import { AIRequestContext, AIInvocationRecord } from '@rr/contracts';

export interface LLMProviderHealth {
  enabled: boolean;
  providerName: string;
  modelName: string;
  ready: boolean;
}

export interface StructuredGenerationRequest<T> {
  context: AIRequestContext;
  systemPrompt: string;
  userPrompt: string;
  schema: any; // Zod schema object internally
}

export interface LLMGenerationResult<T> {
  data?: T;
  record: AIInvocationRecord;
  rawResponse?: string;
  isFallback: boolean;
}

export interface LLMClient {
  generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<LLMGenerationResult<T>>;
  healthCheck(): Promise<LLMProviderHealth>;
}
