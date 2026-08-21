import { RevenueEvent, IngestionResult, MerchantConfig, RecoveryCase } from '@rr/contracts';

export interface IngestionCommand {
  event: RevenueEvent;
  idempotencyKey: string;
  merchantReference: string;
  customerReference: string;
  customerMaskedReference: string;
  customerConsents: {
    email: string;
    sms: string;
    voice: string;
  };
}

export interface IngestionRepository {
  ingestEventAndCreateCaseIfEligible(
    command: IngestionCommand,
    qualifyFn: (event: RevenueEvent, config: MerchantConfig, merchantSegment: string) => import('@rr/contracts').QualificationResult
  ): Promise<IngestionResult>;
}
