# Feature: Webhook Ingestion & Idempotency

## Problem

Razorpay (and webhook systems in general) deliver events *at least once*. A network failure, a load balancer retry, or an operator re-submission can result in the same payment failure event arriving multiple times. Processing a duplicate event must not create duplicate recovery cases, trigger duplicate interventions, or charge a customer twice.

## Motivation

Idempotency is a first-class financial safety requirement. The ingestion layer is the entry point to the entire system — it must be a strict, deterministic filter that ensures each unique external event creates exactly one revenue case and triggers exactly one recovery workflow, regardless of how many times the event is delivered.

## Design

### Ingestion Flow

```
POST /api/events
    ├── Auth Middleware (API token validation)
    ├── DTO Validation (class-validator / Zod)
    ├── Idempotency Guard
    │     ├── Compute idempotency key: merchantId + externalEventId + eventType
    │     ├── Attempt INSERT with UNIQUE constraint on (merchantId, externalEventId, eventType)
    │     └── On conflict: return existing caseId (HTTP 200, not 201)
    ├── Case Created (if new)
    ├── State Machine: INITIAL → DETECTED
    └── Async dispatch to Planning Service
```

### Idempotency Implementation

The uniqueness enforcement is applied at the **database level**, not application level:
```sql
-- Prisma schema
@@unique([merchantId, externalEventId, eventType])
```

This is critical: it makes idempotency *unconditional*. Even if two concurrent requests arrive simultaneously (race condition), only one will succeed at the database level. The other receives a unique constraint violation, which is caught and mapped to a 200 response with the existing case ID.

Additionally, the HTTP layer supports an explicit `Idempotency-Key` header. If provided, it is stored alongside the case and used for response caching — the same key returns the same HTTP response body without re-processing.

### Supported Event Types

| Event Type | Trigger | Description |
|---|---|---|
| `PAYMENT_FAILED` | Card/UPI payment failure | Direct payment failures |
| `MANDATE_FAILED` | eNACH/nach mandate bounce | Subscription-style auto-debit failures |
| `SUBSCRIPTION_CHARGED_FAILED` | Razorpay Subscriptions failure | Managed subscription billing failures |

### Payload Validation

Every incoming webhook payload is validated against a strict typed DTO before reaching the idempotency guard:
- Unknown fields are rejected
- Required fields (`merchantId`, `externalEventId`, `eventType`, `amountMinor`) are enforced
- Invalid `amountMinor` types (e.g., floats) are rejected — only integers accepted

## AI Involvement

**None.** The ingestion and idempotency layer is fully deterministic. No AI call is made during ingestion. Planning (which involves AI) is dispatched asynchronously *after* the case is safely persisted.

## Safety Constraints

- **Database-Level Uniqueness**: The `@@unique` constraint is the authoritative idempotency mechanism. Application-level caches are supplementary.
- **Secure Webhook Verification**: Cryptographically validates `x-razorpay-signature` using HMAC-SHA256 against raw buffers (via NestJS `rawBody`) and `crypto.timingSafeEqual()` to prevent timing side-channel attacks.
- **Atomic Case Creation**: Case creation and the initial state machine transition are wrapped in a single Prisma transaction. Partial state is impossible.
- **Auth Token Enforcement**: The `POST /api/events` endpoint requires a valid `API_AUTH_TOKEN` header. Unauthenticated requests are rejected with HTTP 401 before any processing begins.
- **No Silent Drops**: Validation failures return HTTP 422 with structured error codes. Operators can inspect why a webhook was rejected.

## Failure Cases

| Failure | System Response |
|---|---|
| Duplicate event (same `externalEventId`) | DB unique constraint fires; HTTP 200 returned with existing case ID |
| Malformed payload | DTO validation fails; HTTP 422 with field-level error details |
| Missing auth token | HTTP 401; event not processed |
| DB unavailable during ingestion | HTTP 503; webhook should be retried by Razorpay |
| Unknown event type | DTO validation fails; HTTP 422 |

## Code References

- `apps/api/src/modules/events/` — HTTP event ingestion controller
- `libs/domain/src/idempotency.ts` — Idempotency key computation
- `libs/persistence/prisma/schema.prisma` — `@@unique` constraint on `RevenueCase`
- `tests/integration/api_ingestion.test.ts` — Duplicate event blocking verification
- `tests/integration/recovery_flow.test.ts` — Full ingestion → planning flow
