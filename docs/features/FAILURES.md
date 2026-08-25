# Embracing the Failure: How We Built Resilient Architecture

As part of the Track 03 (AI Revenue Recovery) evaluation, we want to proactively highlight a major systemic failure we encountered during development and how we engineered our way out of it. We did not build a perfect system on day one; we built a system that learned how to crash gracefully.

## The Incident: Recursive API Exhaustion

During early testing, we implemented a naive retry loop. If a payment failed with `bank_technical_error`, the LangGraph agent would immediately schedule a `PAYMENT_RETRY`. 

**What broke?** 
Razorpay's sandbox gateway responded to the retry with another `bank_technical_error`. Because we had not implemented strict state boundaries, the LangGraph workflow instantly observed the failure, planned another retry, and executed it again. Within 1.5 seconds, our background worker executed 45 consecutive retries against the Razorpay API, exhausting our rate limits and locking our test merchant account.

## The Root Cause
The core issue was unbounded AI execution. The LLM was given authority to retry without deterministic stopping rules, and our database lacked concurrency controls. The background worker was processing webhook events faster than the database could commit the updated `attemptCount`.

## The Engineering Fix

To solve this, we implemented three critical architectural constraints:

### 1. Bounded LangGraph Edges (Deterministic Stopping Rules)
We removed the LLM's ability to recursively loop. The LangGraph state machine now has hard-coded, deterministic conditional edges. 
- In the `recommend` node, we strictly check: `if (['insufficient_funds', 'bank_technical_error'].includes(failureCode) && attemptCount < 3)`.
- If the `attemptCount` reaches the threshold set in the `MerchantRecoveryPolicyConfig` (e.g., 3), the policy engine immediately forces the case into a terminal `ESCALATED` state, permanently breaking the loop.

### 2. Optimistic Concurrency Control (OCC)
We added a `@default(1)` version integer to our Prisma `RecoveryCase` schema. 
Before any background worker can execute a plan, it must `UPDATE "RecoveryCase" SET version = version + 1 WHERE id = X AND version = Y`. 
If another concurrent webhook tries to update the same case simultaneously, `Y` will not match, the database returns 0 updated rows, and we throw a `StaleStateConflictError`. This completely eliminated race conditions during rapid webhook ingestion.

### 3. Strict Header-Based Idempotency
To prevent the same webhook from triggering multiple background workers, we implemented an `EventIdempotency` table that strictly checks the `x-razorpay-event-id` header. Duplicate payloads are now silently dropped at the controller level before ever reaching the message queue.

## Conclusion
By embracing this failure, we transformed a fragile AI wrapper into a deterministic, production-grade financial state machine. The system is now mathematically guaranteed to halt before causing financial harm or exhausting API limits.
