import { EventType, RevenueEvent } from './events.js';
import { RecoveryCase, RevenueCaseState } from './case.js';
import { Money } from './money.js';

export interface MerchantConfig {
  supportedEventTypes: EventType[];
  minimumAmountMinor: bigint;
  eventMaxAgeHours: number;
  excludedMerchantSegments: string[];
  supportedCurrencies: string[];
}

export interface QualificationResult {
  eligible: boolean;
  reasonCodes: string[];
  amountAtRisk?: Money;
  initialState?: RevenueCaseState;
  shouldCreateCase: boolean;
}

export interface IngestionResult {
  event: RevenueEvent;
  qualification: QualificationResult;
  revenueCase: RecoveryCase | null;
  correlationId: string;
  idempotentReplay: boolean;
}
