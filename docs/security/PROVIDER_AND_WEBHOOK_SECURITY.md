# Provider and Webhook Security

## 1. Third-Party Credentials (Razorpay, Twilio, LLM)
- Production credentials must NEVER be present in local environments.
- The application enforces `RAZORPAY_MODE=test` safety checks. If the application environment is `demo`, `test`, or `development`, the backend will explicitly throw a `CONFIGURATION_ERROR` if `RAZORPAY_MODE=live` is configured, preventing accidental real-money movement.
- LLM Keys (`LLM_API_KEY`) and Twilio Tokens must be scoped to least privilege.

## 2. Webhook Signature Verification
- All incoming webhooks from Razorpay MUST be validated using `x-razorpay-signature`.
- The webhook secret (`RAZORPAY_WEBHOOK_SECRET`) is separate from the API keys.
- Do not process unverified payloads. If signature verification fails, the system must drop the request with a `400 Bad Request` and log a security alert.

## 3. Idempotency
- Revenue Events ingested from webhooks must be deduplicated using `ingestionIdempotencyKey`.
- External provider calls (e.g., executing a recovery charge) must include an `idempotencyKey` derived from the `Intervention` record to prevent duplicate charges in case of network timeouts.
