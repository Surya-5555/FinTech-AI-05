import { Injectable } from '@nestjs/common';
import { IProviderFactory } from './provider.interface.js';
import { ExecutionProvider, ExecutionActionType } from '@rr/contracts';
import { RazorpayAdapter } from './razorpay/razorpay.adapter.js';
import { TwilioAdapter } from './twilio/twilio.adapter.js';
import { ResendAdapter } from './email/resend.adapter.js';
import { RazorpayRetryAdapter } from './razorpay/razorpay-retry.adapter.js';

@Injectable()
export class ProviderFactory implements IProviderFactory {
  constructor(
    private readonly razorpayAdapter: RazorpayAdapter,
    private readonly twilioAdapter: TwilioAdapter,
    private readonly emailAdapter: ResendAdapter,
    private readonly razorpayRetryAdapter: RazorpayRetryAdapter,
  ) {}

  getProvider(actionType: string): ExecutionProvider {
    switch (actionType) {
      case 'CREATE_PAYMENT_LINK':
        return this.razorpayAdapter;
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
