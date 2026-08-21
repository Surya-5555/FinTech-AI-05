import { z } from 'zod';

export const EvaluationGroundTruthSchema = z.object({
  recoverable: z.boolean(),
  successfulInterventions: z.array(z.string()),
  unsuccessfulInterventions: z.array(z.string()),
  expectedRecoveryAmountMinor: z.string(),
  minimumAttempts: z.number(),
  maximumAttempts: z.number(),
  providerScenario: z.enum([
    'success',
    'timeout_once_then_success',
    'permanent_failure',
    'invalid_response',
    'payment_link_paid_after_event',
    'no_customer_response'
  ]),
  unsafeConditions: z.array(z.string()).optional(),
  expectedEscalation: z.boolean(),
  expectedStop: z.boolean()
});

export const EvaluationCaseSchema = z.object({
  scenarioId: z.string(),
  sourceEvent: z.object({
    eventId: z.string(),
    eventType: z.string(),
    amountMinor: z.string(),
    currency: z.string(),
    failureReason: z.string().nullable().optional(),
    metadata: z.record(z.any())
  }),
  merchantPolicyReference: z.string(),
  maskedCustomerReference: z.string(),
  knownAllowedChannels: z.array(z.string()),
  eventTimestamp: z.string(),
  groundTruth: EvaluationGroundTruthSchema
});

export const EvaluationManifestSchema = z.object({
  datasetVersion: z.string(),
  generatorVersion: z.string(),
  createdAt: z.string(),
  seed: z.number(),
  caseCount: z.number(),
  checksum: z.string(),
  scenarioDistribution: z.record(z.number()),
  limitations: z.array(z.string())
});

export type EvaluationGroundTruth = z.infer<typeof EvaluationGroundTruthSchema>;
export type EvaluationCase = z.infer<typeof EvaluationCaseSchema>;
export type EvaluationManifest = z.infer<typeof EvaluationManifestSchema>;
