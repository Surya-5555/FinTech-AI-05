import { Injectable } from '@nestjs/common';
import { IProviderFactory } from './provider.interface';
import { ExecutionProvider, ExecutionActionType } from '@rr/contracts';
import { RazorpayAdapter } from './razorpay/razorpay.adapter';
import { TwilioAdapter } from './twilio/twilio.adapter';
import { ResendAdapter } from './email/resend.adapter';
import { RazorpayRetryAdapter } from './razorpay/razorpay-retry.adapter';
import { RazorpayTestModeRecoveryAdapter } from './razorpay/razorpay-test-mode-recovery.adapter';

@Injectable()
export class ProviderFactory implements IProviderFactory {
  constructor(
    private readonly razorpayAdapter: RazorpayAdapter,
    private readonly razorpayTestModeAdapter: RazorpayTestModeRecoveryAdapter,
    private readonly twilioAdapter: TwilioAdapter,
    private readonly emailAdapter: ResendAdapter,
    private readonly razorpayRetryAdapter: RazorpayRetryAdapter,
  ) {}

  getProvider(actionType: string): ExecutionProvider {
    switch (actionType) {
      case 'CREATE_PAYMENT_LINK':
        return process.env.ENABLE_RAZORPAY_TEST_MODE === 'true' 
          ? this.razorpayTestModeAdapter 
          : this.razorpayAdapter;
      case 'INITIATE_PAYMENT_RETRY':
        return this.razorpayRetryAdapter;
      case ExecutionActionType.SEND_EMAIL_REMINDER:
        return this.emailAdapter;
      case ExecutionActionType.SEND_SMS_REMINDER:
      case ExecutionActionType.SEND_VOICE_REMINDER:
        return this.twilioAdapter;
      default:
        throw new Error(`No provider configured for action type: ${actionType}`);
    }
  }
}
