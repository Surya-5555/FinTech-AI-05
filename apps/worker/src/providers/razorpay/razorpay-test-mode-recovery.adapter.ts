import { ExecutionProvider, InterventionExecutionRequest, ProviderExecutionResult, ExternalActionErrorCode, ExecutionActionType } from '@rr/contracts';
import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';

@Injectable()
export class RazorpayTestModeRecoveryAdapter implements ExecutionProvider {
  private readonly logger = new Logger(RazorpayTestModeRecoveryAdapter.name);
  private razorpay: Razorpay;
  private readonly isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.ENABLE_RAZORPAY_TEST_MODE === 'true';

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (this.isEnabled) {
      if (!keyId || !keySecret || keyId === 'rzp_test_dummy_key') {
        this.logger.error('CRITICAL SAFETY VIOLATION: Razorpay Test Mode is enabled but valid credentials are missing.');
        throw new Error('ENABLE_RAZORPAY_TEST_MODE is true, but RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are missing or invalid.');
      }
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    } else {
      // In disabled state, we don't instantiate the real client.
      this.razorpay = null as any;
    }
  }

  async execute(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    if (!this.isEnabled) {
      return {
        success: false,
        failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
        rawResponseSnippet: 'Razorpay test mode adapter is disabled by ENABLE_RAZORPAY_TEST_MODE.',
      };
    }

    try {
      if (request.actionType === ExecutionActionType.CREATE_PAYMENT_LINK) {
        return await this.createPaymentLink(request);
      } else {
        return {
          success: false,
          failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
          rawResponseSnippet: `RazorpayTestModeRecoveryAdapter does not support action: ${request.actionType}. It only supports bounded non-destructive actions.`,
        };
      }
    } catch (error: any) {
      this.logger.error(`Razorpay API test-mode error: ${error.message}`, error.stack);
      return {
        success: false,
        failureCode: this.mapRazorpayError(error),
        rawResponseSnippet: error.message || 'Unknown error',
      };
    }
  }

  private async createPaymentLink(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    // Exact mapping of internal idempotency key to external reference
    const referenceId = request.idempotencyKey;
    
    // Call Razorpay Payment Link API safely
    const response = await this.razorpay.paymentLink.create({
      amount: Number(request.amountMinor),
      currency: request.currency,
      accept_partial: false,
      description: `Test-mode Payment Recovery for Case ${request.caseId}`,
      customer: {
        name: request.parameters.customerName as string || 'Customer',
        email: request.parameters.customerEmail as string || 'test@example.com',
        contact: request.parameters.customerPhone as string || '+919999999999'
      },
      notify: {
        sms: false,
        email: true
      },
      reminder_enable: false,
      notes: {
        caseId: request.caseId,
        interventionId: request.interventionId,
        mode: 'test_safety_bounded'
      },
      reference_id: referenceId
    });

    return {
      success: true,
      externalReference: response.id,
      rawResponseSnippet: JSON.stringify({
        id: response.id,
        status: response.status,
        short_url: response.short_url,
        reference_id: response.reference_id
      }),
    };
  }

  private mapRazorpayError(error: any): ExternalActionErrorCode {
    const statusCode = error.statusCode;
    
    if (statusCode === 401 || statusCode === 403) return ExternalActionErrorCode.INVALID_CREDENTIALS;
    if (statusCode === 429) return ExternalActionErrorCode.RATE_LIMITED;
    if (statusCode === 400 && error.error?.description?.includes('reference_id already exists')) {
       // Proper idempotency collision handling mapping
       // In our domain, if we hit reference_id collision, we might have successfully executed it before but lost the response, 
       // but for strict mapping we treat it as an idempotency conflict or just configuration error. 
       // We can return RATE_LIMITED or a custom one if available, but PROVIDER_REJECTED is safer to avoid blind retries.
       return ExternalActionErrorCode.PROVIDER_REJECTED;
    }
    if (statusCode >= 500) return ExternalActionErrorCode.PROVIDER_UNAVAILABLE;
    
    return ExternalActionErrorCode.PROVIDER_REJECTED;
  }
}
