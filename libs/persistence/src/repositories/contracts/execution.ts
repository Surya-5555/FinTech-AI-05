import { InterventionType } from '@rr/contracts';

export interface PrepareInterventionCommand {
  planId: string;
  caseId: string;
  merchantId: string;
  interventionType: InterventionType;
  idempotencyKey: string;
  attemptCount: number;
}

export interface ExecutionRepository {
  findInterventionByIdempotencyKey(idempotencyKey: string): Promise<any | null>;
  prepareInterventionForExecution(command: PrepareInterventionCommand): Promise<any>;
  markCaseForEscalationAfterWorkflowFailure(caseId: string, reason: string): Promise<void>;
  markCaseForStopAfterWorkflowFailure(caseId: string, reason: string): Promise<void>;
}
