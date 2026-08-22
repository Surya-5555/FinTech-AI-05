import { vi } from 'vitest';
export const getPrismaClient = () => ({
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  revenueCase: {
    findMany: vi.fn().mockResolvedValue([{
      id: 'case_1',
      status: 'OPEN',
      amountAtRiskMinor: 100, // Important, service uses .toString() on this
    }]),
    count: vi.fn().mockResolvedValue(1),
  }
});
export class PrismaIngestionRepository {}
export class PrismaPlanningRepository {}
export class PrismaOutboxRepository {}
export class PrismaExecutionRepository {}
export class PlanningRepository {}
export class IngestionRepository {}
export class OutboxRepository {}
export class ExecutionRepository {}
export class PrismaHealthIndicator {
  isHealthy() {
    return Promise.resolve({ db: { status: 'up' } });
  }
}
