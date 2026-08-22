# Threat Model

This document outlines the high-level threat model for the Razorpay AI Revenue Recovery system.

## Assets
1. **Financial Data**: Information about transactions, failures, and recovery amounts.
2. **Customer Data**: PII including masked payment methods, email addresses, and phone numbers.
3. **API Keys**: Credentials for Razorpay, LLM Providers, Twilio, and Resend.
4. **Execution Authority**: The ability to trigger a payment attempt via the Razorpay API.

## Threat Actors
- **External Attackers**: Attempting to breach the public API to steal data or trigger unauthorized actions.
- **Malicious Insiders**: Authorized users attempting to misuse the system or bypass controls.
- **Compromised Dependencies**: Third-party libraries that execute malicious code during build or runtime.

## Identified Threats & Mitigations

### 1. Unauthorized Payment Execution (The "Rogue AI" Scenario)
**Threat**: An LLM hallucinates or is manipulated into commanding the system to execute an unauthorized charge or repeated charges against a customer.
**Mitigation**: Bounded AI Architecture. The LLM cannot directly call APIs. It only suggests a `RecoveryPlan`. The deterministic policy engine validates the plan against hardcoded rules (e.g., maximum attempts, minimum time between attempts, valid failure reasons). All state changes require deterministic idempotency checks.

### 2. Double Charging (Idempotency Failure)
**Threat**: Network timeouts or concurrent requests result in the same recovery intervention executing twice, double-charging the customer.
**Mitigation**: Strict idempotency keys are enforced at the database level (`Intervention.idempotencyKey`) and passed to external providers (Razorpay). The transactional outbox pattern guarantees exactly-once messaging semantics.

### 3. Webhook Spoofing
**Threat**: An attacker sends fake webhook payloads to the system to manipulate case states or trigger false recoveries.
**Mitigation**: All incoming webhooks must be cryptographically verified using `x-razorpay-signature` against the configured webhook secret.

### 4. Secret Leakage
**Threat**: Accidental commit of live API keys to the repository or exposure through logs/dashboard.
**Mitigation**: `DATABASE_URL` and all API keys are passed via environment variables. `.env` files are `.gitignore`d. Audit logs strip plain-text credentials. `configuration.ts` enforces `rzp_test_` prefixes in non-production environments.

### 5. Accidental Production Execution in Demo
**Threat**: A user runs the demo environment but accidentally configures live API keys, causing real financial impact.
**Mitigation**: `APP_ENV=demo` explicitly throws fatal startup errors if `RAZORPAY_MODE=live` or `TWILIO_ENABLED=true` is set.
