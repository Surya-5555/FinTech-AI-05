import { AIInvocationRecord, AIInvocationStatus, AIUseCase } from '@rr/contracts';
import { PrismaClient } from '@prisma/client';

export class AIInvocationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async recordAIInvocation(record: AIInvocationRecord, safeMetadata: Record<string, any> = {}): Promise<void> {
    await this.prisma.aIInvocation.create({
      data: {
        id: record.id,
        useCase: record.useCase,
        providerName: record.providerName ?? null,
        modelName: record.modelName ?? null,
        promptVersion: record.promptVersion,
        inputHash: record.inputHash,
        outputHash: record.outputHash ?? null,
        status: record.status,
        latencyMs: record.latencyMs ?? null,
        estimatedCostMinor: record.estimatedCostMinor ?? null,
        correlationId: record.correlationId,
        safeMetadataJson: JSON.stringify(safeMetadata),
        createdAt: record.createdAt,
      },
    });
  }

  async listAIInvocationsForCase(caseId: string): Promise<any[]> {
    return this.prisma.aIInvocation.findMany({
      where: {
        caseId,
      },
      select: {
        id: true,
        useCase: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
