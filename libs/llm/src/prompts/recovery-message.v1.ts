import { AIRequestContext } from '@rr/contracts';
import { SharedSafetyPolicyV1 } from './shared-safety-policy.v1';

export function getRecoveryMessagePrompt(context: AIRequestContext): string {
  return `
You are tasked with generating a payment recovery message draft.

${SharedSafetyPolicyV1}

CONTEXT:
Data Classification: ${context.dataClassification}
Merchant: ${context.merchantDisplayName}
Amount: ${context.amountDisplay}
Currency: ${context.currency}
Failure Reason: ${context.failureReason}
Root Cause: ${context.rootCause}
Channel: ${context.channel}
Locale: ${context.locale}

CONSTRAINTS:
- Max Characters: ${context.constraints.maxCharacters}
- Allowed Tone: ${context.constraints.allowedTone}
${context.constraints.requiredDisclosure ? `- Required Disclosure: ${context.constraints.requiredDisclosure}` : ''}
- Forbidden Claims: ${context.constraints.forbiddenClaims.join(', ')}
${context.channel === 'VOICE_CALL' ? '- VOICE MODEL TARGET: Sarvam AI Bulbul V3. Generate the script in natural code-mixed Hinglish (Hindi + English) using Latin script. Do not use Devanagari.' : ''}

Respond in valid JSON matching this schema exactly:
{
  "text": "The message draft here",
  "locale": "${context.locale}",
  "channel": "${context.channel}"
}
`;
}
