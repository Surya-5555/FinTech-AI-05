# Feature: AI Messaging — LLM Communication & Hinglish Support

## Problem

When contacting a customer about a failed payment, the message content is as important as the channel. A generic "your payment failed" message is ignored. A message that acknowledges the specific failure, uses the customer's preferred language, and provides a clear call-to-action significantly improves recovery rates. Generating this message dynamically at scale — while ensuring it never makes false claims or violates financial compliance — requires AI.

## Motivation

The LLM messaging system handles the contextual, language-specific content generation layer. It is the *only* AI touchpoint for customer-facing output. Everything it produces is validated against a safety schema before being passed to any execution provider. Its unavailability triggers a safe, deterministic fallback — customer communication is never halted because the LLM is down.

## Design

### Message Generation Pipeline

```
Planning Service selects channel (SMS | EMAIL | VOICE)
    → getRecoveryMessagePrompt(context) builds structured prompt
    → HostedLLMClient.generateStructured(prompt, schema)
    → Zod validation: { text, locale, channel, safetyChecks }
    → If valid: RecoveryMessageDraft used in intervention
    → If invalid / timeout: getFallbackMessageDraft(context)
```

### Prompt Construction

Every message prompt includes:
1. **Data Classification Header**: Marks the data as `SYNTHETIC_BENCHMARK` or `RAZORPAY_TEST` so the model understands it is operating on benchmark evaluation data, not live customer records.
2. **SharedSafetyPolicyV1**: A system-level instruction block that forbids:
   - Specific recovery amount claims ("We will recover ₹X")
   - Guarantees of any kind
   - Urgency language that constitutes pressure selling
   - Content that could be classified as financial advice
3. **Context Block**: Merchant name, amount, failure reason, root cause, channel, locale, constraints
4. **Output Schema**: Strict JSON format the model must conform to

### Locale Support

| Locale Code | Language | Example Output |
|---|---|---|
| `EN_IN` | English (Indian) | "Dear Priya, your payment of ₹1,200 to Zomato Pro was unsuccessful due to insufficient funds." |
| `HI_IN` | Hinglish (Hindi-English mix) | "Priya ji, aapka ₹1,200 ka payment Zomato Pro ke liye process nahi hua. Naya payment link yahan se complete karein." |
| `TA_IN` | Tamil | "வணக்கம்! Zomato Pro-க்கான உங்கள் ₹1,200 தொகை நிலுவையில் உள்ளது. இப்போதே செலுத்துங்கள்." |
| `KN_IN` | Kannada | "ನಮಸ್ಕಾರ! Zomato Pro ಗಾಗಿ ನಿಮ್ಮ ₹1,200 ಪಾವತಿ ಬಾಕಿ ಇದೆ. ಈಗಲೇ ಪಾವತಿ ಮಾಡಿ." |

**Hinglish** (`HI_IN`) is the primary regional locale. The LLM prompt explicitly instructs the model to produce natural Hindi-English code-mixed text that is legible to urban Indian customers. The fallback template for `HI_IN` provides a static Hinglish message that does not require the LLM.

### Fallback Templates

If the LLM is unavailable (timeout, API error, malformed output), the system uses deterministic templates:

**English SMS Fallback:**
```
Reminder: Payment of {amount} for {merchant} is due.
```

**Hinglish SMS Fallback:**
```
Namaste! {merchant} ke liye aapka {amount} ka payment pending hai. Abhi pay karein.
```

**Email Fallback:**
```
Dear customer,

This is a notification that a payment of {amount} to {merchant} was unsuccessful
due to {failureReason}. Please ensure sufficient funds or update your payment method.
```

## Safety Constraints

- **Zod Schema Validation**: Every LLM response is parsed through a strict schema. A response that passes the schema is guaranteed to have `text`, `locale`, `channel`, and `safetyChecks.passed=true`. A response failing this check activates the fallback immediately.
- **Forbidden Claims Enforcement**: The prompt lists `forbiddenClaims` explicitly (e.g., "payment will be recovered", "guaranteed refund"). The safety check in the response schema asks the model to self-report any violation.
- **No Direct Customer Contact**: The message draft is returned as text. It is the execution provider (Twilio, Resend) that actually sends it — and only after the policy engine approves the intervention containing it. The LLM cannot trigger a send.
- **LLM Cannot Modify Case State**: The message draft is an output artifact. It has no write path to the database or the case state machine.

## Failure Cases

| Failure | System Response |
|---|---|
| LLM API down | Fallback template for the appropriate channel and locale |
| LLM response fails Zod validation | Fallback template; validation error logged with context |
| LLM generates content violating `safetyChecks` | Fallback template; safety violation logged |
| Unknown locale requested | Defaults to `EN_IN` fallback template |
| Empty or null LLM response | Treated as validation failure; fallback activated |

## Code References

- `libs/llm/src/prompts/recovery-message.v1.ts` — Message prompt builder
- `libs/llm/src/prompts/decision-explanation.v1.ts` — Diagnosis prompt builder
- `libs/llm/src/prompts/shared-safety-policy.v1.ts` — Shared safety system prompt
- `libs/llm/src/fallbacks/templates.ts` — Deterministic fallback content (EN + HI_IN)
- `libs/llm/src/client/llm.client.ts` — `HostedLLMClient` with timeout + Gemini provider
- `libs/llm/src/validators/` — Zod schema definitions for LLM output
- `libs/llm/src/safety/` — Safety check utilities
