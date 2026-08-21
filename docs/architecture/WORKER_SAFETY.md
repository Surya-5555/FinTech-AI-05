# Worker Safety Principles

The `apps/worker` service orchestrates async recovery plan execution. In Phase 3.1, its primary role is to re-evaluate conditions and prepare an intervention.

## Core Rules

1. **Re-Validation First**: By the time a job is pulled from the queue, state may have changed (e.g., the customer paid out of band, or a merchant changed their policy). The worker MUST re-fetch state from the primary DB (PostgreSQL) and re-run policy evaluation (`proposeRecoveryPlan`).
2. **Idempotency Everywhere**: 
    - The queue job ID is deterministic (`{planId}-enqueue`).
    - The Intervention ID / idempotency key is deterministic (`{planId}-{interventionType}-{attempt}`).
    - If a job is redelivered or the worker crashes mid-processing, it must safely resume or discard duplicates without creating extra records.
3. **No External Side Effects in 3.1**: The worker currently prepares the `Intervention` record and marks the `RevenueCase` as `EXECUTING`. It does not hit Razorpay or SMS providers yet.
4. **Escalation**: If a workflow fails internally (e.g., DB down) up to its retry limit, the worker explicitly escalates the case (e.g. `ESCALATED`) so human operators are aware of stranded workflows.
