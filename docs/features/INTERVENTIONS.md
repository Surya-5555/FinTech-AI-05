# Feature: Intervention Selection & Execution

## Problem

Not every payment failure calls for the same recovery action. Blindly retrying a card declined for `insufficient_funds` wastes the API call and may trigger fraud flags. A card declined for `card_expired` needs a new payment method link, not a retry. The system must select the right intervention type, validate it against policy, and execute it exactly once.

## Motivation

A typed intervention entity decouples the *decision* (what to do) from the *execution* (doing it). This allows the policy engine to gate the plan before any external action is taken, and allows the worker to claim an at-most-once execution lock before contacting any external provider.

## Design

### Intervention Types

| Type | Description | When Used |
|---|---|---|
| `RETRY_PAYMENT` | Silent API retry against Razorpay | Transient errors (bank timeout, network glitch) |
| `SEND_PAYMENT_LINK` | Generate a fresh Razorpay payment link | Card expired, invalid CVV — needs customer action |
| `SEND_SMS_REMINDER` | Twilio SMS with payment link | Customer needs nudge; consent verified |
| `SEND_EMAIL_REMINDER` | Resend email with payment link | Customer prefers email; consent verified |
| `ESCALATE_TO_HUMAN` | Flag case for manual review | Fraud suspected, max attempts reached |

### Intervention Entity Fields

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Unique intervention ID |
| `caseId` | UUID | FK to parent RevenueCase |
| `type` | enum | One of the types above |
| `status` | enum | `PENDING → EXECUTING → SUCCEEDED / FAILED` |
| `lockedBy` | string | Worker ID holding the execution lock |
| `lockedAt` | timestamp | Lock acquisition time |
| `resultCode` | string | Provider outcome code |
| `resultPayload` | JSON | Full provider response |

## Data Flow

```
Planning Service → selects intervention type based on AI + ML scores
    → Policy Engine validates (consent, cooldown, attempt count)
    → Approved: intervention record CREATED (status=PENDING)
    → BullMQ job dispatched with interventionId
    → Worker picks up job
    → Worker claims execution lock (atomic DB update)
    → Worker calls ExecutionProvider adapter
    → Provider returns outcome
    → Worker persists result (status=SUCCEEDED | FAILED)
    → Audit log entry written
    → Case state updated (RECOVERED | FAILED)
```

## AI Involvement

The intervention *type* is selected by:
1. **ML Causal Propensity Score**: The T-Learner estimates the Net Expected Incremental Value per treatment arm (Retry, Payment Link, No Action). The highest NEIV arm wins, subject to cost constraints.
2. **LLM Reasoning**: For communication interventions (SMS, email), the LLM drafts the message content. The intervention executes only after the policy engine approves the draft.

AI selects the type. Deterministic code executes it. AI cannot override the execution lock or the policy gate.

## Safety Constraints

- **At-Most-Once Execution Lock**: Before calling any external provider, the worker performs an atomic `UPDATE ... SET lockedBy = $workerId WHERE lockedBy IS NULL`. If a second worker attempts the same intervention, the lock fails and the job is silently dropped.
- **No Replay After Result**: Once `resultCode` is set, the intervention is terminal. No re-execution path exists in the codebase.
- **Provider Timeout Wrapping**: Every adapter call is wrapped with a configurable timeout. Timeouts map to `TIMEOUT` result codes, not exceptions.
- **Razorpay Test-Mode Only**: The `RazorpayAdapter` checks `ENABLE_RAZORPAY_TEST_MODE=true`. If false (production), it throws a `ConfigurationError` rather than silently reaching live APIs.

## Failure Cases

| Failure | System Response |
|---|---|
| Worker crashes after lock but before result | Lock is held; second worker is blocked. Supervisor process can release stale locks after TTL |
| Provider returns 5xx | Mapped to `PROVIDER_ERROR`; attempt count incremented |
| Provider times out | Mapped to `TIMEOUT`; BullMQ may retry the job (bounded) |
| Intervention for wrong case state | State machine guard rejects transition before execution |
| Duplicate job delivery from BullMQ | Execution lock blocks double-execution; idempotent result |

## Code References

- `libs/domain/src/intervention.ts` — Intervention type logic
- `apps/worker/src/processors/` — BullMQ job processor
- `apps/worker/src/providers/razorpay/razorpay.adapter.ts` — Razorpay execution adapter
- `apps/worker/src/providers/twilio/` — SMS provider
- `libs/persistence/src/repositories/execution.repository.ts` — Lock and result persistence
- `tests/integration/resilience_flow.test.ts` — Lock, timeout, and failure scenarios
