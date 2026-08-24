# Feature: Revenue Case Lifecycle

## Problem

When a payment fails (e.g., a subscription mandate bounce, a card expiry, a bank timeout), Razorpay merchants lose revenue silently. Without structured tracking, there is no reliable way to know which failures are recoverable, which have already been attempted, and which have been permanently resolved. Without a lifecycle, the same failure can be retried indefinitely — wasting API quota, triggering fraud flags, and annoying customers.

## Motivation

A typed, state-machine-enforced case entity provides the system's single source of truth for every revenue loss event. Every other module (planning, policy, execution, evaluation) operates against a case and must respect its state. This prevents split-brain scenarios, uncontrolled retries, and orphaned interventions.

## Design

### Case Entity Fields

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Globally unique case identifier |
| `merchantId` | string | Owning merchant |
| `externalEventId` | string | Raw event ID from Razorpay webhook |
| `eventType` | enum | `PAYMENT_FAILED`, `MANDATE_FAILED`, etc. |
| `amountMinor` | BigInt | Amount at risk in minor units (paisa) |
| `currency` | string | ISO 4217 currency code |
| `failureCode` | string | Razorpay decline code |
| `status` | enum | Current lifecycle state |
| `version` | int | Optimistic concurrency counter |
| `attemptCount` | int | Total intervention attempts made |
| `createdAt` / `updatedAt` | timestamp | Audit timestamps |

### Lifecycle States

```
DETECTED → PLANNED → EXECUTING → RECOVERED
                               → FAILED
                   → STOPPED
                   → ESCALATED
```

- **DETECTED**: Webhook received, idempotency check passed, case created.
- **PLANNED**: AI + policy engine approved an intervention plan.
- **EXECUTING**: BullMQ worker has claimed the job and is contacting the provider.
- **RECOVERED**: Provider confirmed success; revenue is recovered.
- **FAILED**: Provider returned a definitive failure; case may retry if `attemptCount < max`.
- **STOPPED**: Policy engine rejected further intervention (e.g., fraud flag, consent missing).
- **ESCALATED**: `maxAttemptsPerCase` exhausted; human review required.

## Data Flow

```
Webhook Arrival
    → Ingestion Controller (HTTP POST /events)
    → Idempotency Guard (unique constraint check)
    → Case Repository (CREATE new RevenueCase)
    → State Machine (INITIAL → DETECTED)
    → AI Planning Service (async)
    → Policy Engine (sync gate)
    → BullMQ Queue dispatch (if approved)
    → Worker Execution (async)
    → Outcome persistence (RECOVERED | FAILED | ESCALATED)
```

## AI Involvement

AI is involved **exclusively in the PLANNED transition**:
- The LLM diagnoses the failure root cause and drafts customer communication.
- The ML model provides causal propensity scores (CATE) that inform intervention selection.
- AI output is validated by Zod schema before it can influence any state transition.
- If AI fails, deterministic fallback templates are used — the case still progresses.

## Safety Constraints

- **Optimistic Concurrency Control**: Every state transition increments `version`. A stale update (wrong version) is rejected with a `ConflictError`. This prevents race conditions between the planning service and the worker.
- **Terminal State Guard**: Cases in `RECOVERED`, `STOPPED`, or `ESCALATED` states cannot be transitioned further. Any attempt is silently rejected.
- **Maximum Attempt Enforcement**: The policy engine checks `attemptCount >= maxAttemptsPerCase` before approving any new intervention. If exhausted, the case is escalated.

## Failure Cases

| Failure | System Response |
|---|---|
| Duplicate webhook for same case | Idempotency constraint blocks creation; existing case returned |
| Worker crash mid-execution | Distributed lock prevents second worker from double-executing |
| Database transaction failure | Prisma transaction rollback; case state unchanged |
| AI returns invalid schema | Zod validation fails; fallback template used; planning continues |
| State transition with stale version | `ConflictError` thrown; caller must refresh and retry |

## Code References

- `libs/domain/src/state-machine.ts` — Transition logic and version enforcement
- `libs/persistence/src/repositories/` — Case CRUD with Prisma
- `apps/api/src/modules/cases/cases.service.ts` — HTTP-facing case management
- `tests/integration/recovery_flow.test.ts` — Full golden path verification
