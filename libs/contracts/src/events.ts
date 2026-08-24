import { EventId, MerchantId, CustomerId, CorrelationId } from './identifiers';
import { Money } from './money';

export enum EventType {
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CHECKOUT_ABANDONED = 'CHECKOUT_ABANDONED',
  SUBSCRIPTION_FAILED = 'SUBSCRIPTION_FAILED',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  PAYMENT_RECOVERED = 'PAYMENT_RECOVERED',
  PAYMENT_STATUS_UPDATED = 'PAYMENT_STATUS_UPDATED',
}

export enum PaymentFailureReason {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  BANK_TIMEOUT = 'BANK_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  PAYMENT_METHOD_DECLINED = 'PAYMENT_METHOD_DECLINED',
  MANDATE_FAILED = 'MANDATE_FAILED',
  SUSPECTED_FRAUD = 'SUSPECTED_FRAUD',
  UNKNOWN = 'UNKNOWN',
}

export interface RevenueEvent {
  eventId: EventId;
  externalEventId: string;
  merchantId: MerchantId;
  customerId: CustomerId;
  eventType: EventType;
  occurredAt: Date;
  amount: Money;
  failureReason?: PaymentFailureReason;
  correlationId: CorrelationId;
  rawPayloadVersion: string;
  metadata: Record<string, string | number | boolean>;
}
