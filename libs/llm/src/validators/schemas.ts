import { z } from 'zod';
import { AILocale } from '@rr/contracts';

export const RecoveryMessageDraftSchema = z.object({
  text: z.string().min(1).max(2000),
  locale: z.nativeEnum(AILocale),
  channel: z.string(),
});

export const DecisionExplanationSchema = z.object({
  summary: z.string().min(1).max(1000),
  bulletReasons: z.array(z.string()).min(1),
  policyBoundaryStatement: z.string(),
});

export type RecoveryMessageDraftOutput = z.infer<typeof RecoveryMessageDraftSchema>;
export type DecisionExplanationOutput = z.infer<typeof DecisionExplanationSchema>;
