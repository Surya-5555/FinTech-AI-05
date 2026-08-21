import { ExecutionProvider, InterventionExecutionRequest, ProviderExecutionResult, ExternalActionErrorCode } from '@rr/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentRetrySimulator implements ExecutionProvider {
  private readonly logger = new Logger(PaymentRetrySimulator.name);

  async execute(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    this.logger.log(`Simulating payment retry for case ${request.caseId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (request.actionType !== 'INITIATE_PAYMENT_RETRY') {
       return {
          success: false,
          failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
          rawResponseSnippet: `Unsupported action for PaymentRetrySimulator: ${request.actionType}`,
        };
    }

    // Simulate 5% failure rate for realism if needed, but keep it deterministic for now
    if (request.parameters.simulateFailure === true || request.parameters.simulateFailure === 'true') {
      return {
        success: false,
        failureCode: ExternalActionErrorCode.PROVIDER_REJECTED,
        rawResponseSnippet: 'Simulated payment retry rejected by gateway'
      };
    }

    const referenceId = `sim_retry_${request.interventionId}_${randomUUID().substring(0, 8)}`;
    
    return {
      success: true,
      externalReference: referenceId,
      rawResponseSnippet: 'Simulated payment retry initiated successfully',
    };
  }
}
