import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { ExecutionProvider, ExecutionActionType, InterventionExecutionRequest, ProviderExecutionResult, ExternalActionErrorCode, AIUseCase, CorrelationId } from '@rr/contracts';
import { LLMClient, HostedLLMClient } from '@rr/llm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EscalationService implements ExecutionProvider {
  private readonly logger = new Logger(EscalationService.name);
  private llmClient: LLMClient;
  private ragContext: string = '';

  constructor() {
    this.llmClient = new HostedLLMClient({
      apiKey: process.env.GEMINI_API_KEY || 'mock-key-for-now',
      model: 'gemini-1.5-flash',
    });
    this.loadSopContext();
  }

  private loadSopContext() {
    try {
      const sopPath = path.resolve(process.cwd(), 'INTERVENTIONS.md');
      this.ragContext = fs.readFileSync(sopPath, 'utf8');
    } catch (e) {
      this.logger.warn('INTERVENTIONS.md not found, RAG context will be empty');
      this.ragContext = 'No Standard Operating Procedures available.';
    }
  }

  async execute(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    try {
      this.logger.log(`Generating Human Escalation SOP via RAG for case ${request.caseId}`);
      
      const systemPrompt = `You are a Revenue Recovery RAG system. Based on the following SOP context, generate a concise, actionable human escalation ticket summary for case ${request.caseId} (Amount: ${request.amountMinor}).\n\nContext:\n${this.ragContext}`;
      
      const userPrompt = `Generate a JSON object with 'ticketTitle', 'suggestedAction', and 'priority' based on the SOP.`;

      const response = await this.llmClient.generateStructured<{
        ticketTitle: string;
        suggestedAction: string;
        priority: string;
      }>({
        systemPrompt,
        userPrompt,
        schema: z.object({
          ticketTitle: z.string(),
          suggestedAction: z.string(),
          priority: z.string(),
        }) as any,
        context: {
          correlationId: request.caseId as unknown as CorrelationId,
          useCase: AIUseCase.RECOVERY_DECISION_EXPLANATION, 
        } as any,
      });

      if (response.isFallback || !response.data) {
        throw new Error('LLM Failed to generate SOP');
      }

      this.logger.log(`Created Escalation Ticket: [${response.data.priority}] ${response.data.ticketTitle}`);

      return {
        success: true,
        externalReference: `ESCALATION_${Date.now()}`,
      };
    } catch (error) {
      this.logger.error(`Failed to generate human escalation: ${error}`);
      return {
        success: false,
        failureCode: ExternalActionErrorCode.PROVIDER_UNAVAILABLE,
      };
    }
  }
}
