import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class InterventionsService {
  private readonly prisma = new PrismaClient();

  async getInterventions(query: { limit?: number; offset?: number; caseId?: string }) {
    const { limit = 50, offset = 0, caseId } = query;
    const where = caseId ? { caseId } : {};

    const [items, total] = await Promise.all([
      this.prisma.intervention.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { outcome: true }
      }),
      this.prisma.intervention.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  async getInterventionById(id: string) {
    return this.prisma.intervention.findUnique({
      where: { id },
      include: { outcome: true }
    });
  }
}
