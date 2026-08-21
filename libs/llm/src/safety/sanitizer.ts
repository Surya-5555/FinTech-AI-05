import { AIRequestContext, AIResponseSafetyResult } from '@rr/contracts';

export function sanitizeAndValidateDraft(
  text: string, 
  context: AIRequestContext
): AIResponseSafetyResult {
  const reasonCodes: string[] = [];
  let accepted = true;
  let fallbackRequired = false;

  // 1. Check length
  if (text.length > context.constraints.maxCharacters) {
    accepted = false;
    fallbackRequired = true;
    reasonCodes.push('EXCEEDS_MAX_CHARACTERS');
  }

  // 2. Check forbidden claims
  const lowerText = text.toLowerCase();
  for (const claim of context.constraints.forbiddenClaims) {
    if (lowerText.includes(claim.toLowerCase())) {
      accepted = false;
      fallbackRequired = true;
      reasonCodes.push(`CONTAINS_FORBIDDEN_CLAIM_${claim.toUpperCase().replace(/\s/g, '_')}`);
    }
  }

  // 3. Check for obvious PII/secret requests
  const dangerousPatterns = [
    /\b(pin|otp|cvv|password)\b/i,
    /\b(card number|bank account)\b/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(text)) {
      accepted = false;
      fallbackRequired = true;
      reasonCodes.push('REQUESTS_SENSITIVE_INFO');
    }
  }

  // 4. Sanitize (Remove scripts/HTML)
  if (/<[a-z][\s\S]*>/i.test(text)) {
    accepted = false;
    fallbackRequired = true;
    reasonCodes.push('CONTAINS_HTML_OR_SCRIPTS');
  }

  // 5. Check required disclosure
  if (context.constraints.requiredDisclosure) {
    if (!lowerText.includes(context.constraints.requiredDisclosure.toLowerCase())) {
      accepted = false;
      fallbackRequired = true;
      reasonCodes.push('MISSING_REQUIRED_DISCLOSURE');
    }
  }

  return {
    accepted,
    reasonCodes,
    redactionsApplied: [],
    fallbackRequired
  };
}
