import { RevenueEvent, EventType, MerchantConfig, QualificationResult, RevenueCaseState, PaymentFailureReason } from '@rr/contracts';

export function qualifyRevenueEvent(event: RevenueEvent, config: MerchantConfig, merchantSegment: string): QualificationResult {
  const reasons: string[] = [];
  let eligible = true;
  let shouldCreateCase = true;
  let amountAtRisk = event.amount;

  // 1. Check excluded segments
  if (config.excludedMerchantSegments && config.excludedMerchantSegments.includes(merchantSegment)) {
    reasons.push('MERCHANT_SEGMENT_EXCLUDED');
    eligible = false;
  }

  // 1. Minimum Amount
  if (amountAtRisk.amountMinor <= 0n) {
    reasons.push('ZERO_AMOUNT');
    eligible = false;
  } else if (amountAtRisk.amountMinor < config.minimumAmountMinor) {
    reasons.push('BELOW_MINIMUM_AMOUNT');
    eligible = false;
  }

  // 2. Supported Currencies
  if (!(config.supportedCurrencies || []).includes(amountAtRisk.currency)) {
    reasons.push('UNSUPPORTED_CURRENCY');
    eligible = false;
  }

  // 3. Stale event
  const now = Date.now();
  const eventTime = event.occurredAt.getTime();
  const ageHours = (now - eventTime) / (1000 * 60 * 60);
  if (ageHours > config.eventMaxAgeHours) {
    reasons.push('EVENT_STALE');
    eligible = false;
  }

  // 4. Supported Event Types
  if (!(config.supportedEventTypes || []).includes(event.eventType)) {
    reasons.push('UNSUPPORTED_EVENT_TYPE');
    eligible = false;
  }

  // 5. Specific Event Type Rules
  switch (event.eventType) {
    case EventType.PAYMENT_FAILED:
      if (!event.failureReason || event.failureReason === PaymentFailureReason.UNKNOWN) {
        reasons.push('UNSUPPORTED_FAILURE_REASON');
        eligible = false;
      }
      break;
    case EventType.SUBSCRIPTION_FAILED:
      break;
    case EventType.INVOICE_OVERDUE:
      break;
    case EventType.CHECKOUT_ABANDONED:
      // must have positive cart/order amount in metadata
      // The amount is already checked above as positive, but let's make sure if checkout abandoned, it relies on event amount
      break;
    case EventType.PAYMENT_RECOVERED:
    case EventType.PAYMENT_STATUS_UPDATED:
      reasons.push('NON_ACTIONABLE_EVENT_TYPE');
      eligible = false;
      break;
    default:
      reasons.push('UNKNOWN_EVENT_TYPE');
      eligible = false;
      break;
  }

  if (!eligible) {
    shouldCreateCase = false;
  }

  const result: QualificationResult = {
    eligible,
    reasonCodes: reasons,
    shouldCreateCase
  };
  
  if (eligible) {
    result.amountAtRisk = amountAtRisk;
    result.initialState = RevenueCaseState.DETECTED;
  }
  
  return result;
}
