import { ExecutionProvider, InterventionExecutionRequest, ProviderExecutionResult, ExternalActionErrorCode } from '@rr/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class SimulatedCommunicationAdapter implements ExecutionProvider {
  private readonly logger = new Logger(SimulatedCommunicationAdapter.name);

  async execute(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    this.logger.log(`Simulating communication: ${request.actionType} for case ${request.caseId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Simulate 5% failure rate for realism if needed, but keep it deterministic for now
    if (request.parameters.simulateFailure === true || request.parameters.simulateFailure === 'true') {
      return {
        success: false,
        failureCode: ExternalActionErrorCode.PROVIDER_UNAVAILABLE,
        rawResponseSnippet: 'Simulated communication failure'
      };
    }

    const referenceId = `sim_comm_${request.interventionId}_${randomUUID().substring(0, 8)}`;
    
    let message = '';
    switch (request.actionType) {
      case 'SEND_SIMULATED_EMAIL':
        message = `Simulated Email sent to ${request.parameters.customerEmail}`;
        break;
      case 'SEND_SIMULATED_SMS':
        message = `Simulated SMS sent to ${request.parameters.customerPhone}`;
        break;
      case 'SEND_SIMULATED_VOICE':
        message = `Simulated Voice call made to ${request.parameters.customerPhone}`;
        break;
      default:
        return {
          success: false,
          failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
          rawResponseSnippet: `Unsupported communication action: ${request.actionType}`,
        };
    }

    return {
      success: true,
      externalReference: referenceId,
      rawResponseSnippet: message,
    };
  }
}
