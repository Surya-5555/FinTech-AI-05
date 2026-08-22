# Failure & Resilience Documentation

This document outlines the failure scenarios the AI Revenue Recovery system is designed to handle, and how it safely recovers from them. All scenarios documented here are verified by deterministic integration tests (`tests/integration/resilience_flow.test.ts`).

## 1. External Adapter Failures (Razorpay / Twilio / Resend)

### Scenario
An external provider API times out, returns a transient 5xx error, or the action parameters are invalid/unsupported (e.g. attempting an unsupported Razorpay action).

### System Response
1. **Bounded Execution**: The worker invokes the adapter with a timeout and retry wrapper.
2. **Safe Fallback**: If the adapter fails, the failure code (e.g., `TIMEOUT`, `CONFIGURATION_ERROR`) is caught.
3. **State Integrity**: No double execution occurs. The result is mapped correctly to a failure outcome.
4. **Escalation**: The failure increments the attempt count. Once `maxAttemptsPerCase` is exhausted, the workflow is safely halted and marked as `ESCALATED`.

## 2. Worker Node Crash / Restart

### Scenario
A worker picks up a scheduled intervention, acquires the execution lock, but crashes (e.g., OOM, pod restart, network partition) before successfully marking the intervention as executed or failed in the database.

### System Response
1. **Idempotent Lock Generation**: Before execution, the system claims a distributed lock in the database (`lockedBy`, `lockedAt`).
2. **Double Execution Prevention**: A secondary or restarted worker attempting to pick up the same execution payload will be rejected deterministically by the lock mechanism.
3. **At-Most-Once Guarantee**: The target payment gateway or messaging endpoint will never be hit twice for the same logical intervention attempt.

## 3. Database Persistence / Atomicity Failures

### Scenario
The system attempts to transition the case state and save the intervention result, but the underlying transaction fails (e.g., foreign key violation, temporary disconnect, or an invalid case state transition).

### System Response
1. **Transaction Rollback**: The persistence layer (`PrismaExecutionRepository`) wraps these operations in strict ACID transactions.
2. **No Partial States**: A failure here results in a complete rollback. The intervention attempt is not recorded as successful, and the case state remains unchanged, meaning it can be safely retried or escalated by a supervisor process without corrupting business logic.

## 4. Workflow Exhaustion

### Scenario
An external system continues to fail, or a customer repeatedly fails retries. The maximum allowed retries are exhausted.

### System Response
1. **Deterministic Stopping Rules**: The execution engine detects that `attemptCount >= maxAttemptsPerCase`.
2. **Audit & Escalation**: The system automatically adds an `ESCALATION_TRIGGERED` audit log and halts further automation.
3. **Safety First**: The final state transitions to `ESCALATED`, ensuring no runaway looping or unrestricted automation drains funds or spams customers.

## 5. LLM Unavailability

### Scenario
The AI reasoning engine (e.g., Gemini / Claude API) becomes unavailable, times out, or returns severely malformed JSON that fails validation.

### System Response
1. **Circuit Breaking**: The `HostedLLMClient` applies a strict timeout.
2. **Deterministic Fallbacks**: If the AI model fails, the fallback module provides static, safe reasoning templates. This ensures the fintech workflow continues processing cases deterministically rather than stalling entirely.
