import { LLMClient, LLMProviderHealth, StructuredGenerationRequest, LLMGenerationResult } from './llm.client';
import { AIInvocationStatus, AIInvocationRecord, AIUseCase } from '@rr/contracts';
import { generateId } from '@rr/utils';
import { createHash } from 'crypto';

// Gemini API base URL — uses generateContent with JSON response mode
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export class HostedLLMClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(options: { apiKey: string; model: string; timeoutMs?: number }) {
    this.apiKey = options.apiKey;
    // Default to gemini-1.5-flash if no model specified
    this.model = options.model || 'gemini-1.5-flash';
    this.timeoutMs = options.timeoutMs || 15000;
  }

  async generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<LLMGenerationResult<T>> {
    const startTime = Date.now();
    const inputString = request.systemPrompt + request.userPrompt;
    const inputHash = createHash('sha256').update(inputString).digest('hex').substring(0, 16);
    const correlationId = request.context.correlationId;

    const record: AIInvocationRecord = {
      id: generateId('ai'),
      useCase: request.context.useCase as AIUseCase,
      providerName: 'GOOGLE_GEMINI',
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
      // Gemini uses a different URL structure and request body format
      const url = `${GEMINI_BASE_URL}/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // System instruction is separate in Gemini API
          systemInstruction: {
            parts: [{ text: request.systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: request.userPrompt }],
            },
          ],
          // Force JSON output from Gemini
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1, // Low temperature for deterministic financial decisions
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        record.status = AIInvocationStatus.PROVIDER_ERROR;
        record.latencyMs = Date.now() - startTime;
        return { record, isFallback: true };
      }

      const data = await response.json();
      // Gemini response structure: candidates[0].content.parts[0].text
      const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
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
      providerName: 'GOOGLE_GEMINI',
      modelName: this.model,
      ready: !!this.apiKey,
    };
  }
}

