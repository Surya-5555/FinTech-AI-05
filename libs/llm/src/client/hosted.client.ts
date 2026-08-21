import { LLMClient, LLMProviderHealth, StructuredGenerationRequest, LLMGenerationResult } from './llm.client.js';
import { AIInvocationStatus, AIInvocationRecord, AIUseCase } from '@rr/contracts';
import { generateId } from '@rr/utils';
import { createHash } from 'crypto';

export class HostedLLMClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(options: { apiKey: string; model: string; timeoutMs?: number }) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs || 10000;
  }

  async generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<LLMGenerationResult<T>> {
    const startTime = Date.now();
    const inputString = request.systemPrompt + request.userPrompt;
    const inputHash = createHash('sha256').update(inputString).digest('hex').substring(0, 16);
    const correlationId = request.context.correlationId;

    const record: AIInvocationRecord = {
      id: generateId('ai'),
      useCase: request.context.useCase as AIUseCase,
      providerName: 'OPENAI_COMPATIBLE',
      modelName: this.model,
      promptVersion: 'v1',
      inputHash,
      status: AIInvocationStatus.SUCCEEDED,
      correlationId,
      createdAt: new Date(),
    };

    if (!this.apiKey) {
      record.status = AIInvocationStatus.PROVIDER_ERROR;
      record.latencyMs = Date.now() - startTime;
      return { record, isFallback: true };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        record.status = response.status === 429 ? AIInvocationStatus.PROVIDER_ERROR : AIInvocationStatus.PROVIDER_ERROR;
        record.latencyMs = Date.now() - startTime;
        return { record, isFallback: true };
      }

      const data = await response.json();
      const rawContent = data.choices[0]?.message?.content || '{}';
      const outputHash = createHash('sha256').update(rawContent).digest('hex').substring(0, 16);
      
      record.outputHash = outputHash;
      record.latencyMs = Date.now() - startTime;

      let parsedData: T;
      try {
        parsedData = JSON.parse(rawContent) as T;
      } catch (err) {
        record.status = AIInvocationStatus.VALIDATION_FAILED;
        return { record, rawResponse: rawContent, isFallback: true };
      }

      // Add actual zod parsing safely outside if needed, this just tries basic JSON
      // Validation will happen at the caller level

      return {
        data: parsedData,
        record,
        rawResponse: rawContent,
        isFallback: false,
      };

    } catch (error: any) {
      clearTimeout(timeout);
      record.latencyMs = Date.now() - startTime;
      record.status = error.name === 'AbortError' ? AIInvocationStatus.TIMEOUT : AIInvocationStatus.PROVIDER_ERROR;
      return { record, isFallback: true };
    }
  }

  async healthCheck(): Promise<LLMProviderHealth> {
    return {
      enabled: !!this.apiKey,
      providerName: 'OPENAI_COMPATIBLE',
      modelName: this.model,
      ready: !!this.apiKey,
    };
  }
}
