import { Injectable } from '@nestjs/common';
import { getPrismaClient } from '@rr/persistence';

@Injectable()
export class CasesService {
  async getCases(query: { limit?: number; offset?: number; merchantId?: string }) {
    const prisma = getPrismaClient();
    const take = query.limit || 10;
    const skip = query.offset || 0;

    const where = query.merchantId ? { merchantId: query.merchantId } : {};

    const [items, total] = await Promise.all([
      prisma.revenueCase.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.revenueCase.count({ where }),
    ]);

    return {
      items: items.map(this.mapCase),
      total,
      limit: take,
      offset: skip,
    };
  }

  async getCaseById(id: string) {
    const prisma = getPrismaClient();
    const caseItem = await prisma.revenueCase.findUnique({
      where: { id }
    });
    
    if (!caseItem) return null;

    const [plans, auditLogs, events, interventions] = await Promise.all([
      prisma.recoveryPlan.findMany({ where: { caseId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.auditLog.findMany({ where: { entityId: id }, orderBy: { timestamp: 'desc' } }),
      prisma.revenueEvent.findMany({ where: { correlationId: caseItem.correlationId }, orderBy: { occurredAt: 'desc' } }),
      prisma.intervention.findMany({ 
        where: { caseId: id }, 
        orderBy: { createdAt: 'desc' },
        include: { outcome: true }
      })
    ]);

    return {
      ...this.mapCase(caseItem),
      plans,
      auditLogs,
      events: events.map(e => ({ ...e, amountMinor: e.amountMinor.toString() })),
      interventions: interventions.map(i => ({
        ...i,
        outcome: i.outcome ? { ...i.outcome, recoveredAmountMinor: i.outcome.recoveredAmountMinor?.toString() } : null
      }))
    };
  }

  private mapCase(c: any) {
    return {
      ...c,
      amountAtRiskMinor: c.amountAtRiskMinor.toString()
    };
  }
}
