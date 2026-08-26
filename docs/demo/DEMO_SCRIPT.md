# Live Demo Script & Synthetic Data Guide

This document outlines the step-by-step process for recording your 5-minute pitch video for the Razorpay AI Buildathon (Track 03). It includes instructions for loading synthetic data and intentionally triggering a critical failure.

```mermaid
journey
    title 5-Minute Judge Demo Walkthrough
    section Preparation (Before Recording)
      Seed synthetic batch: 5: Operator
      Verify 50 DETECTED cases: 5: Dashboard
    section Golden Path (0:00 - 2:30)
      Show Architecture Diagram: 5: README
      Demonstrate Policy Engine: 5: Code
      Show Smart Dunning in Action: 5: Dashboard
    section Triggered Failure (2:30 - 4:00)
      Induce DB Lock: 3: Terminal
      Observe Gateway Timeout: 3: Terminal
      Show Graceful Halting: 4: Logs
      Verify Audit Trail: 5: Database
    section Closing (4:00 - 5:00)
      Explain Bounded AI Philosophy: 5: Presenter
      Show Immutable Reasoning Trace: 5: AuditLog
```

*(or in text format below)*

### Demo Walkthrough (Text View)
1. **Preparation:** Seed synthetic batch (`pnpm seed:synthetic-batch`), verify 50 `DETECTED` cases on the dashboard.
2. **Golden Path (0:00–2:30):** Show architecture diagram, demonstrate policy engine code, highlight smart dunning (payment link for `card_expired`, payday rescheduling for `insufficient_funds`).
3. **Triggered Failure (2:30–4:00):** Induce a DB lock, observe graceful timeout handling, show clean state machine abort in logs, verify audit trail captures the failure.
4. **Closing (4:00–5:00):** Explain the bounded AI philosophy, show the immutable `reasoningTrace` in the `AuditLog`.

## 1. Preparation & Synthetic Data Batch
Before starting the recording, ensure the system is seeded with our synthetic batch of 50 failed transactions spanning multiple error codes (`insufficient_funds`, `card_expired`, `authentication_failed`).

Run the following command to inject the test batch into the local PostgreSQL instance:
```bash
pnpm seed:synthetic-batch
```
Verify the dashboard shows 50 active cases in the `DETECTED` state.

## 2. The Golden Path (Minutes 0:00 - 2:30)
1. **Explain the Architecture**: Briefly show the `README.md` diagram. Emphasize the separation between the fast webhook ingestion (200 OK within 5s) and the background BullMQ worker.
2. **Show the Policy Engine**: Highlight `policy.ts`. Show how we enforce RBI Time-of-Day compliance and TRAI consent checks *before* any money movement.
3. **Smart Dunning in Action**: Show the dashboard. Point out a `card_expired` case and show that the system instantly generated a tokenized payment link (Zero-Friction). Then point out an `insufficient_funds` case and show that it was rescheduled to the next Payday (Temporal Markers).

## 3. Triggered System Failure (Minutes 2:30 - 4:00)
*This is the most critical part of the pitch.* You must demonstrate that the system fails gracefully under duress.

1. **Induce a DB Lock**: While the background worker is running, open a separate terminal and run:
   ```bash
   pnpm run:trigger-db-lock
   ```
   *This script runs an uncommitted `BEGIN; SELECT * FROM "RecoveryCase" FOR UPDATE;` blocking all other transactions.*
2. **Observe the Gateway Timeout**: Trigger a manual webhook retry.
3. **Demonstrate Graceful Halting**: Show the terminal logs for the background worker. It will print a massive `StaleStateConflictError` or `TransactionTimeoutError`.
4. **Show the Audit Trail**: Open the `AuditLog` table. Show the judges that the failure was perfectly caught, logged, and the state machine cleanly aborted without causing a recursive loop or duplicate payment.

## 4. Closing (Minutes 4:00 - 5:00)
1. **The "Why"**: Reiterate that AI shouldn't just be a thin adapter; it must be bound by deterministic fintech rules.
2. **The Result**: Point out the immutable `reasoningTrace` in the `AuditLog`, proving that every AI decision in this system is explainable and compliant.
