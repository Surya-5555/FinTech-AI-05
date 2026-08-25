import { AIRequestContext, RecoveryMessageDraft, DecisionExplanation, AIFallbackSource, AILocale } from '@rr/contracts';

/**
 * Deterministic fallback message templates.
 * Used when the LLM is unavailable, returns malformed output, or fails safety validation.
 * Supports EN_IN (English), HI_IN / HINGLISH (Hinglish), TA_IN (Tamil), KN_IN (Kannada).
 * Covers the key Razorpay merchant markets: Hindi belt, Tamil Nadu, and Karnataka (Razorpay HQ).
 * These templates are intentionally conservative — they do NOT make recovery guarantees.
 */
export function getFallbackMessageDraft(context: AIRequestContext): RecoveryMessageDraft {
  const locale = context.locale || AILocale.EN_IN;
  let text = '';
  let templateVersion = 'fallback-v1';

  if (context.activeNetworkDowntime) {
    if (locale === AILocale.HI_IN || locale === AILocale.HINGLISH) {
      text = `Hi, ${context.merchantDisplayName} ka payment network issue ke karan fail hua. Kripya doosre payment method (Credit/Debit Card) se try karein.`;
      templateVersion = 'fallback-downtime-hinglish-v1';
    } else if (locale === AILocale.TA_IN) {
      text = `வணக்கம், பிணைய பிரச்சனையால் ${context.merchantDisplayName} கட்டணம் தோல்வியடைந்தது. வேறு கட்டண முறையை (கார்டு) பயன்படுத்தவும்.`;
      templateVersion = 'fallback-downtime-tamil-v1';
    } else if (locale === AILocale.KN_IN) {
      text = `ನಮಸ್ಕಾರ, ನೆಟ್‌ವರ್ಕ್ ಸಮಸ್ಯೆಯಿಂದ ${context.merchantDisplayName} ಪಾವತಿ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಬೇರೆ ಪಾವತಿ ವಿಧಾನವನ್ನು ಬಳಸಿ.`;
      templateVersion = 'fallback-downtime-kannada-v1';
    } else {
      text = `Hi, your payment to ${context.merchantDisplayName} failed due to an active network downtime. Please retry using an alternative payment method (like a Card).`;
      templateVersion = 'fallback-downtime-v1';
    }
  } else if (context.channel === 'SEND_SMS_REMINDER') {
    // Select message by locale — covers Hindi belt, Tamil Nadu, and Karnataka (Razorpay HQ region)
    if (locale === AILocale.HI_IN || locale === AILocale.HINGLISH) {
      text = `Namaste! ${context.merchantDisplayName} ke liye aapka ${context.amountDisplay} ka payment pending hai. Abhi pay karein.`;
      templateVersion = 'fallback-hinglish-v1';
    } else if (locale === AILocale.TA_IN) {
      text = `வணக்கம்! ${context.merchantDisplayName}-க்கான உங்கள் ₹${context.amountDisplay} தொகை நிலுவையில் உள்ளது. இப்போதே செலுத்துங்கள்.`;
      templateVersion = 'fallback-tamil-v1';
    } else if (locale === AILocale.KN_IN) {
      text = `ನಮಸ್ಕಾರ! ${context.merchantDisplayName} ಗಾಗಿ ನಿಮ್ಮ ${context.amountDisplay} ಪಾವತಿ ಬಾಕಿ ಇದೆ. ಈಗಲೇ ಪಾವತಿ ಮಾಡಿ.`;
      templateVersion = 'fallback-kannada-v1';
    } else {
      text = `Reminder: Payment of ${context.amountDisplay} for ${context.merchantDisplayName} is due.`;
    }
  } else if (context.channel === 'SEND_VOICE_REMINDER') {
    // Voice channel: full sentence, friendly tone, readable aloud by TTS
    if (locale === AILocale.HI_IN || locale === AILocale.HINGLISH) {
      text = `Namaste, yeh ek reminder hai. Aapka ${context.merchantDisplayName} ke liye ${context.amountDisplay} ka payment abhi bhi baaki hai. Kripya apni payment poori karein.`;
      templateVersion = 'fallback-hinglish-v1';
    } else if (locale === AILocale.TA_IN) {
      text = `வணக்கம், இது ஒரு நினைவூட்டல். ${context.merchantDisplayName}-க்கான உங்கள் ${context.amountDisplay} தொகை இன்னும் நிலுவையில் உள்ளது. தயவுசெய்து உங்கள் கட்டணத்தை முடிக்கவும்.`;
      templateVersion = 'fallback-tamil-v1';
    } else if (locale === AILocale.KN_IN) {
      text = `ನಮಸ್ಕಾರ, ಇದು ಒಂದು ಜ್ಞಾಪನೆ. ${context.merchantDisplayName} ಗಾಗಿ ನಿಮ್ಮ ${context.amountDisplay} ಪಾವತಿ ಇನ್ನೂ ಬಾಕಿ ಇದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪಾವತಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.`;
      templateVersion = 'fallback-kannada-v1';
    } else {
      text = `Hello, this is a reminder regarding your payment of ${context.amountDisplay} to ${context.merchantDisplayName}.`;
    }
  } else {
    // Email or generic fallback
    if (locale === AILocale.HI_IN || locale === AILocale.HINGLISH) {
      text = `Priya grahak,\n\nAapka ${context.merchantDisplayName} ke liye ${context.amountDisplay} ka payment ${context.failureReason} ki wajah se process nahi ho saka.\n\nKripya apne account mein sufficient funds ensure karein ya payment method update karein.\n\nDhanyavaad.`;
      templateVersion = 'fallback-hinglish-v1';
    } else if (locale === AILocale.TA_IN) {
      text = `அன்புள்ள வாடிக்கையாளரே,\n\n${context.merchantDisplayName}-க்கான உங்கள் ${context.amountDisplay} தொகை ${context.failureReason} காரணமாக செயலாக்கப்படவில்லை.\n\nதயவுசெய்து போதுமான நிதி இருப்பை உறுதிப்படுத்தவும் அல்லது உங்கள் கட்டண முறையை புதுப்பிக்கவும்.\n\nநன்றி.`;
      templateVersion = 'fallback-tamil-v1';
    } else if (locale === AILocale.KN_IN) {
      text = `ಪ್ರಿಯ ಗ್ರಾಹಕರೇ,\n\n${context.merchantDisplayName} ಗಾಗಿ ನಿಮ್ಮ ${context.amountDisplay} ಪಾವತಿ ${context.failureReason} ಕಾರಣದಿಂದ ಪ್ರಕ್ರಿಯೆಗೊಳ್ಳಲಿಲ್ಲ.\n\nದಯವಿಟ್ಟು ಸಾಕಷ್ಟು ಹಣ ಇರುವುದನ್ನು ಖಚಿತಪಡಿಸಿ ಅಥವಾ ನಿಮ್ಮ ಪಾವತಿ ವಿಧಾನವನ್ನು ನವೀಕರಿಸಿ.\n\nಧನ್ಯವಾದಗಳು.`;
      templateVersion = 'fallback-kannada-v1';
    } else {
      text = `Dear customer,\n\nThis is a notification that a payment of ${context.amountDisplay} to ${context.merchantDisplayName} was unsuccessful due to ${context.failureReason}.\n\nPlease ensure sufficient funds or update your payment method.\n\nThank you.`;
    }
  }

  return {
    text,
    locale,
    channel: context.channel,
    templateVersion,
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
