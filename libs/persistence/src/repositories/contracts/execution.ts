import { InterventionType } from '@rr/contracts';

export interface PrepareInterventionCommand {
  planId: string;
  caseId: string;
  merchantId: string;
  interventionType: InterventionType;
  idempotencyKey: string;
  attemptCount: number;
}

import { InterventionExecutionResult } from '@rr/contracts';

export interface ExecutionRepository {
  findInterventionByIdempotencyKey(idempotencyKey: string): Promise<any | null>;
  prepareInterventionForExecution(command: PrepareInterventionCommand): Promise<any>;
  markCaseForEscalationAfterWorkflowFailure(caseId: string, reason: string): Promise<void>;
  markCaseForStopAfterWorkflowFailure(caseId: string, reason: string): Promise<void>;
  
  claimExecutionLock(interventionId: string, workerId: string): Promise<boolean>;
  persistExecutionResult(result: InterventionExecutionResult, resultingCaseState: string): Promise<void>;
  scheduleRetry(interventionId: string, delayMs: number): Promise<void>;
  blockExecution(interventionId: string, reason: string): Promise<void>;
}

