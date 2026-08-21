import { AIRequestContext, RecoveryMessageDraft, DecisionExplanation, AIFallbackSource, AILocale } from '@rr/contracts';

export function getFallbackMessageDraft(context: AIRequestContext): RecoveryMessageDraft {
  let text = '';
  
  if (context.channel === 'SEND_SMS_REMINDER') {
    text = `Reminder: Payment of ${context.amountDisplay} for ${context.merchantDisplayName} is due.`;
  } else if (context.channel === 'SEND_VOICE_REMINDER') {
    text = `Hello, this is a reminder regarding your payment of ${context.amountDisplay} to ${context.merchantDisplayName}.`;
  } else {
    // Email or generic
    text = `Dear customer,\n\nThis is a notification that a payment of ${context.amountDisplay} to ${context.merchantDisplayName} was unsuccessful due to ${context.failureReason}.\n\nPlease ensure sufficient funds or update your payment method.\n\nThank you.`;
  }

  return {
    text,
    locale: context.locale || AILocale.EN_IN,
    channel: context.channel,
    templateVersion: 'fallback-v1',
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
