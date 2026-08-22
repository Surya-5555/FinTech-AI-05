import { RecoveryCase, RevenueEvent, AuditLog, RecoveryPlan, InterventionOutcome, EvaluationRun } from '@rr/contracts';

export interface RevenueCaseRepository {
  findById(id: string): Promise<RecoveryCase | null>;
  create(rc: RecoveryCase): Promise<void>;
  transitionWithVersion(rc: RecoveryCase, nextState: string, newVersion: number): Promise<void>;
}

export interface RevenueEventRepository {
  createOrReturnExisting(event: RevenueEvent): Promise<RevenueEvent>;
}

export interface AuditLogRepository {
  appendAuditLog(log: AuditLog): Promise<void>;
}
// Further repository interfaces will be expanded in next phases.
export * from './ingestion';
