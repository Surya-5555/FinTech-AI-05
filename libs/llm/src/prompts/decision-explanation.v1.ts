import { AIRequestContext } from '@rr/contracts';
import { SharedSafetyPolicyV1 } from './shared-safety-policy.v1.js';

export function getDecisionExplanationPrompt(context: AIRequestContext): string {
  return `
You are tasked with generating a human-readable explanation of an already-deterministic recovery decision.

${SharedSafetyPolicyV1}

CONTEXT:
Data Classification: ${context.dataClassification}
Failure Reason: ${context.failureReason}
Root Cause: ${context.rootCause}
Intervention Type: ${context.interventionType}
Policy Reason Codes: ${context.policyReasonCodes.join(', ')}

INSTRUCTIONS:
Explain why the intervention type was chosen based on the policy reason codes and failure reason.
Do NOT invent new reason codes or contradict the actual decision.
Do NOT make promises about recovery success.

Respond in valid JSON matching this schema exactly:
{
  "summary": "Short 1-2 sentence summary of the decision.",
  "bulletReasons": ["Reason 1", "Reason 2"],
  "policyBoundaryStatement": "A standard disclaimer that this is a system-generated deterministic decision."
}
`;
}
