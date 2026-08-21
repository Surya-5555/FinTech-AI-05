import { ExecutionProvider, InterventionExecutionRequest, ProviderExecutionResult, ExternalActionErrorCode } from '@rr/contracts';
import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import { randomUUID } from 'crypto';

@Injectable()
export class RazorpayAdapter implements ExecutionProvider {
  private readonly logger = new Logger(RazorpayAdapter.name);
  private readonly razorpay: any;
  private readonly isTestMode: boolean;

  constructor() {
    this.isTestMode = process.env.RAZORPAY_MODE === 'test';
    
    if (!this.isTestMode) {
      this.logger.error('CRITICAL SAFETY VIOLATION: Razorpay adapter initialized without test mode enabled.');
      // In a real app we might throw here, but for safety we just won't instantiate real credentials
    }

    // Use dummy credentials if not available
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

    this.razorpay = new Razorpay({
      key_id,
      key_secret,
    });
  }

  async execute(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    if (!this.isTestMode) {
      return {
        success: false,
        failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
        rawResponseSnippet: 'Razorpay mode is not test. Aborting execution for safety.',
      };
    }

    try {
      if (request.actionType === 'CREATE_PAYMENT_LINK') {
        return this.createPaymentLink(request);
      } else {
        return {
          success: false,
          failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
          rawResponseSnippet: `Unsupported Razorpay action: ${request.actionType}`,
        };
      }
    } catch (error: any) {
      this.logger.error(`Razorpay API error: ${error.message}`, error.stack);
      return {
        success: false,
        failureCode: this.mapRazorpayError(error),
        rawResponseSnippet: error.message || 'Unknown error',
      };
    }
  }

  private async createPaymentLink(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    const referenceId = `plink_${request.interventionId}_${randomUUID().substring(0, 8)}`;
    
    // Call Razorpay Payment Link API
    const response = await this.razorpay.paymentLink.create({
      amount: Number(request.amountMinor),
      currency: request.currency,
      accept_partial: false,
      description: `Payment Recovery for Case ${request.caseId}`,
      customer: {
        name: request.parameters.customerName as string || 'Customer',
        email: request.parameters.customerEmail as string || 'test@example.com',
        contact: request.parameters.customerPhone as string || '+919999999999'
      },
      notify: {
        sms: true,
        email: true
      },
      reminder_enable: true,
      notes: {
        caseId: request.caseId,
        interventionId: request.interventionId,
      },
      reference_id: referenceId
    });

    return {
      success: true,
      externalReference: response.id,
      rawResponseSnippet: `Payment link created: ${response.short_url}`,
    };
  }

  private mapRazorpayError(error: any): ExternalActionErrorCode {
    if (error.statusCode === 401 || error.statusCode === 403) return ExternalActionErrorCode.INVALID_CREDENTIALS;
    if (error.statusCode === 429) return ExternalActionErrorCode.RATE_LIMITED;
    if (error.statusCode >= 500) return ExternalActionErrorCode.PROVIDER_UNAVAILABLE;
    return ExternalActionErrorCode.PROVIDER_REJECTED;
  }
}
