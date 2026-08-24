import { AIRequestContext, RecoveryMessageDraft, DecisionExplanation, AIFallbackSource, AILocale } from '@rr/contracts';

/**
 * Deterministic fallback message templates.
 * Used when the LLM is unavailable, returns malformed output, or fails safety validation.
 * Supports EN_IN (English) and HI_IN (Hinglish) locales.
 * These templates are intentionally conservative — they do NOT make recovery guarantees.
 */
export function getFallbackMessageDraft(context: AIRequestContext): RecoveryMessageDraft {
  const isHinglish = context.locale === AILocale.HI_IN;
  let text = '';

  if (context.channel === 'SEND_SMS_REMINDER') {
    // Hinglish (HI_IN): natural Hindi-English code-mix for urban Indian customers
    text = isHinglish
      ? `Namaste! ${context.merchantDisplayName} ke liye aapka ${context.amountDisplay} ka payment pending hai. Abhi pay karein.`
      : `Reminder: Payment of ${context.amountDisplay} for ${context.merchantDisplayName} is due.`;
  } else if (context.channel === 'SEND_VOICE_REMINDER') {
    // Voice channel: full sentence, friendly tone, readable aloud
    text = isHinglish
      ? `Namaste, yeh ek reminder hai. Aapka ${context.merchantDisplayName} ke liye ${context.amountDisplay} ka payment abhi bhi baaki hai. Kripya apni payment poori karein.`
      : `Hello, this is a reminder regarding your payment of ${context.amountDisplay} to ${context.merchantDisplayName}.`;
  } else {
    // Email or generic fallback
    text = isHinglish
      ? `Priya grahak,\n\nAapka ${context.merchantDisplayName} ke liye ${context.amountDisplay} ka payment ${context.failureReason} ki wajah se process nahi ho saka.\n\nKripya apne account mein sufficient funds ensure karein ya payment method update karein.\n\nDhanyavaad.`
      : `Dear customer,\n\nThis is a notification that a payment of ${context.amountDisplay} to ${context.merchantDisplayName} was unsuccessful due to ${context.failureReason}.\n\nPlease ensure sufficient funds or update your payment method.\n\nThank you.`;
  }

  return {
    text,
    locale: context.locale || AILocale.EN_IN,
    channel: context.channel,
    templateVersion: isHinglish ? 'fallback-hinglish-v1' : 'fallback-v1',
    safetyChecks: {
      passed: true,
      issues: [],
    },
    source: AIFallbackSource.DETERMINISTIC_FALLBACK,
  };
}

export function getFallbackDecisionExplanation(context: AIRequestContext): DecisionExplanation {
  return {
    summary: `Based on policy rules, intervention ${context.interventionType} was selected.`,
    bulletReasons: context.policyReasonCodes.length > 0 ? context.policyReasonCodes : ['Standard recovery procedure applied'],
    policyBoundaryStatement: 'This decision was made deterministically based on account history and current failure state.',
    source: AIFallbackSource.DETERMINISTIC_FALLBACK,
  };
}
