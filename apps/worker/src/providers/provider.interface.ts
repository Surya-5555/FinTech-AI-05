import { ExecutionProvider, InterventionExecutionRequest, ProviderExecutionResult } from '@rr/contracts';

export interface IProviderFactory {
  getProvider(actionType: string): ExecutionProvider;
}
