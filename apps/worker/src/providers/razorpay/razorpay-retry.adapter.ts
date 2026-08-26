import { ExecutionProvider, InterventionExecutionRequest, ProviderExecutionResult, ExternalActionErrorCode } from '@rr/contracts';
import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';

@Injectable()
export class RazorpayRetryAdapter implements ExecutionProvider {
  private readonly logger = new Logger(RazorpayRetryAdapter.name);
  private razorpay: Razorpay | null = null;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const isTestMode = process.env.ENABLE_RAZORPAY_TEST_MODE === 'true' || process.env.RAZORPAY_MODE === 'test';

    if (isTestMode && keyId && keySecret) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    } else {
      this.logger.warn('Razorpay Test Mode credentials not configured. Adapter will fail securely.');
    }
  }

  async execute(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    if (!this.razorpay) {
      return {
        success: false,
        failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
        rawResponseSnippet: 'Razorpay adapter not configured correctly or not in test mode',
      };
    }

    try {
      const { amountMinor, currency, idempotencyKey, parameters } = request;
      const mandateId = parameters.mandateId as string;
      const customerId = parameters.customerId as string;

      if (!mandateId) {
        return {
          success: false,
          failureCode: ExternalActionErrorCode.PROVIDER_REJECTED,
          rawResponseSnippet: 'Cannot retry payment without a mandateId',
        };
      }

      // Create an order via razorpay to charge the mandate
      const orderOptions = {
        amount: Number(amountMinor),
        currency: currency,
        receipt: idempotencyKey,
        payment_capture: 1, // auto capture
        method: 'emandate', // assuming emandate
        token_id: mandateId,
        customer_id: customerId,
      };

      // Since we are creating a charge on an existing mandate
      const order = await this.razorpay.orders.create(orderOptions as any);

      // In test mode, we just record the order created.
      return {
        success: true,
        externalReference: order.id,
        rawResponseSnippet: JSON.stringify(order),
      };

    } catch (error: any) {
      this.logger.error(`Razorpay Retry Error: ${error.message}`, error.stack);
      return {
        success: false,
        failureCode: ExternalActionErrorCode.PROVIDER_REJECTED,
        rawResponseSnippet: error.message,
      };
    }
  }
}
