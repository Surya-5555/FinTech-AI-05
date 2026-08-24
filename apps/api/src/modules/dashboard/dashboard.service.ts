import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const cases = await this.prisma.client.revenueCase.findMany({
      select: { state: true, amountAtRiskMinor: true }
    });

    let totalAtRiskMinor = 0n;
    let totalRecoveredMinor = 0n;
    
    const casesByState: Record<string, number> = {};
    for (const c of cases) {
      casesByState[c.state] = (casesByState[c.state] || 0) + 1;
      totalAtRiskMinor += c.amountAtRiskMinor;
    }

    const outcomes = await this.prisma.client.interventionOutcome.findMany({
      where: { status: 'SUCCESS' },
      select: { recoveredAmountMinor: true }
    });

    for (const o of outcomes) {
      if (o.recoveredAmountMinor) {
        totalRecoveredMinor += o.recoveredAmountMinor;
      }
    }

    const recoveryRate = totalAtRiskMinor > 0n 
      ? Number(totalRecoveredMinor) / Number(totalAtRiskMinor) 
      : 0;

    const escalations = await this.prisma.client.escalation.count({
      where: { status: 'ACTIVE' }
    });

    const interventions = await this.prisma.client.intervention.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const interventionsByStatus = interventions.reduce((acc: any, curr: any) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAtRiskMinor: totalAtRiskMinor.toString(),
      totalRecoveredMinor: totalRecoveredMinor.toString(),
      incrementalRecoveredMinor: totalRecoveredMinor.toString(), // For demo purposes, assuming Baseline is 0
      recoveryRate,
      casesByState,
      interventionsByStatus,
      activeEscalations: escalations,
      health: {
        provider: 'HEALTHY',
        queue: 'HEALTHY'
      },
      dataMode: 'BENCHMARK', // anonymized benchmark dataset mode
      generatedAt: new Date().toISOString()
    };
  }

  async getRecoveryFunnel() {
    const cases = await this.prisma.client.revenueCase.findMany({
      select: { state: true, amountAtRiskMinor: true }
    });

    const counts: Record<string, { count: number, amountMinor: string }> = {
      DETECTED: { count: 0, amountMinor: '0' },
      QUALIFIED: { count: 0, amountMinor: '0' },
      DIAGNOSED: { count: 0, amountMinor: '0' },
      PLANNED: { count: 0, amountMinor: '0' },
      POLICY_CHECKED: { count: 0, amountMinor: '0' },
      QUEUED: { count: 0, amountMinor: '0' },
      EXECUTING: { count: 0, amountMinor: '0' },
      RECOVERED: { count: 0, amountMinor: '0' },
      ESCALATED: { count: 0, amountMinor: '0' },
      STOPPED: { count: 0, amountMinor: '0' },
      EXPIRED: { count: 0, amountMinor: '0' }
    };

    for (const stage of Object.keys(counts)) {
       counts[stage] = { count: 0, amountMinor: '0' };
    }

    for (const c of cases) {
      if (!counts[c.state]) {
        counts[c.state] = { count: 0, amountMinor: '0' };
      }
      const currentAmount = counts[c.state]?.amountMinor || '0';
      counts[c.state]!.count++;
      counts[c.state]!.amountMinor = (BigInt(currentAmount) + c.amountAtRiskMinor).toString();
    }

    return counts;
  }
}
