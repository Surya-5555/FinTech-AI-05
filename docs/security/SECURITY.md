# Security Model

## AI / Tool Boundary

The AI (LLM) is strictly bounded to an **advisory role**:

| AI Can Do | AI Cannot Do |
|---|---|
| Generate root-cause diagnosis text | Execute payment retries |
| Draft empathetic customer messages | Mutate case state in the database |
| Explain recovery decisions for operator review | Bypass policy gates or consent checks |
| | Set intervention amounts or idempotency keys |
| | Access raw database or queue connections |

The LLM receives a structured prompt with case context and returns a text string. This string is placed into a DTO and validated by the NestJS `ValidationPipe` before any downstream processing. The LLM has no tools, function-calling capabilities, or direct database access.

If the LLM is unavailable, the system uses deterministic fallback templates (`libs/llm/src/fallbacks/templates.ts`) and continues operating normally.

## Policy Gates

Every intervention passes through the deterministic policy engine before execution:

1. **Merchant Policy Check**: Verifies the intervention type is allowed for the merchant's configured recovery policy.
2. **Customer Consent Check**: Validates that the customer has opted in to the communication channel (Email, SMS, Voice). Missing consent blocks the intervention with reason code `CONSENT_MISSING`.
3. **Stopping Rules**: Enforces `maxAttemptsPerCase` thresholds. If the case has exceeded the maximum allowed attempts, the plan is rejected with `POLICY_REJECTED` and the case is escalated.
4. **Fraud Guard**: Cases flagged as `SCN_FRAUD_SUSPECTED` are blocked from retry — the policy engine blocks them deterministically.

**Code**: `libs/domain/src/policy.ts`

## Idempotency

The system enforces idempotency at multiple layers:

| Layer | Mechanism |
|---|---|
| Event Ingestion | Database unique constraint on `(merchantId, externalEventId, eventType)` |
| Intervention Execution | Distributed lock via `lockedBy`/`lockedAt` fields — `claimExecutionLock()` rejects concurrent claims |
| External API Calls | Razorpay adapter maps idempotency keys from the intervention record to the API request |
| State Transitions | Optimistic concurrency control via `version` field on `RevenueCase` |
| Outbox Publishing | `OutboxEvent` status locking prevents duplicate message emission |

## Authentication & Authorization

### Bearer Token Guard
All mutation endpoints require a valid Bearer token via the `Authorization` header:

```
Authorization: Bearer <API_AUTH_TOKEN>
```

The token is configured via the `API_AUTH_TOKEN` environment variable and validated by `OperatorAuthGuard` (`apps/api/src/common/guards/operator-auth.guard.ts`).

### Protected Endpoints (Mutations)
- `POST /events/ingest` — Event ingestion
- `POST /cases/:caseId/plans` — Recovery plan creation
- `POST /cases/:caseId/plans/:planId/enqueue` — Plan execution enqueue
- `PUT /policies/merchants/:merchantId` — Merchant policy update
- `POST /cases/:caseId/message-draft` — AI message draft request

### Open Endpoints (Reads)
Read-only endpoints (`GET /cases`, `GET /dashboard/*`, `GET /evaluation/*`, `GET /health/*`) are intentionally open to support the operations console without requiring auth configuration.

### Fail-Closed Behavior
- Missing or invalid Bearer token → `401 Unauthorized`
- Missing `API_AUTH_TOKEN` environment variable → Application refuses to process authenticated requests
- Invalid Razorpay key prefix (not `rzp_test_`) when test mode is enabled → Boot crash

## Input Validation

The API uses NestJS `ValidationPipe` with strict settings:
- `whitelist: true` — Strips unknown properties from request bodies
- `forbidNonWhitelisted: true` — Rejects requests containing unexpected fields with `400 Bad Request`
- `transform: true` — Automatically transforms payloads to DTO class instances

This prevents any unauthorized fields from being injected into the system, whether from operators, scripts, or LLM-generated payloads.

## Secrets Handling

- All secrets (database credentials, API keys, auth tokens) are loaded from environment variables via `.env` files.
- `.env` files are excluded from Git via `.gitignore`.
- `.env.example` contains only placeholder values with no real credentials.
- Pino logger is configured to redact `req.headers.authorization`, `req.headers.cookie`, `req.body.token`, and `req.body.apiKey` from all log output.

## Data Handling

- The system operates entirely on synthetic data during evaluation and demo.
- Customer display names use masked references (`displayNameOrMaskedReference`), not real PII.
- All monetary values use `BigInt` minor units — no floating-point approximation.
