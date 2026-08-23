import { Injectable } from '@nestjs/common';
import { getPrismaClient } from '@rr/persistence';

@Injectable()
export class CasesService {
  async getCases(query: { limit?: number; cursor?: string; merchantId?: string }) {
    const prisma = getPrismaClient();
    const take = query.limit || 10;
    
    const where = query.merchantId ? { merchantId: query.merchantId } : {};

    const findOpts: any = {
      where,
      take,
      orderBy: { createdAt: 'desc' },
    };

    if (query.cursor) {
      findOpts.cursor = { id: query.cursor };
      findOpts.skip = 1; // skip the cursor itself
    }

    const items = await prisma.revenueCase.findMany(findOpts);
    
    // We can do a total count, but often with cursor pagination it's omitted or cached. 
    // We'll keep it for the dashboard if needed.
    const total = await prisma.revenueCase.count({ where });

    const nextCursor = items.length === take ? items[items.length - 1]?.id : null;

    return {
      items: items.map(this.mapCase),
      total,
      limit: take,
      nextCursor,
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
