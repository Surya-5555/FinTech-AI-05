import { Injectable } from '@nestjs/common';
import { IProviderFactory } from './provider.interface.js';
import { ExecutionProvider } from '@rr/contracts';
import { RazorpayAdapter } from './razorpay/razorpay.adapter.js';
import { SimulatedCommunicationAdapter } from './simulators/simulated-communication.adapter.js';
import { PaymentRetrySimulator } from './simulators/payment-retry.simulator.js';

@Injectable()
export class ProviderFactory implements IProviderFactory {
  constructor(
    private readonly razorpayAdapter: RazorpayAdapter,
    private readonly simulatedCommunicationAdapter: SimulatedCommunicationAdapter,
    private readonly paymentRetrySimulator: PaymentRetrySimulator,
  ) {}

  getProvider(actionType: string): ExecutionProvider {
    switch (actionType) {
      case 'CREATE_PAYMENT_LINK':
        return this.razorpayAdapter;
      case 'INITIATE_PAYMENT_RETRY':
        return this.paymentRetrySimulator;
      case 'SEND_SIMULATED_EMAIL':
      case 'SEND_SIMULATED_SMS':
      case 'SEND_SIMULATED_VOICE':
        return this.simulatedCommunicationAdapter;
      default:
        throw new Error(`No provider configured for action type: ${actionType}`);
    }
  }
}
