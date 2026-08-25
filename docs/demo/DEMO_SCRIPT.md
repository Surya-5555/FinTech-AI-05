# Live Demo Script & Synthetic Data Guide

This document outlines the step-by-step process for recording your 5-minute pitch video for the Razorpay AI Buildathon (Track 03). It includes instructions for loading synthetic data and intentionally simulating a critical failure.

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

## 3. Simulated System Failure (Minutes 2:30 - 4:00)
*This is the most critical part of the pitch.* You must demonstrate that the system fails gracefully under duress.

1. **Induce a DB Lock**: While the background worker is running, open a separate terminal and run:
   ```bash
   pnpm run:simulate-db-lock
   ```
   *This script runs an uncommitted `BEGIN; SELECT * FROM "RecoveryCase" FOR UPDATE;` blocking all other transactions.*
2. **Observe the Gateway Timeout**: Trigger a manual webhook retry.
3. **Demonstrate Graceful Halting**: Show the terminal logs for the background worker. It will print a massive `StaleStateConflictError` or `TransactionTimeoutError`.
4. **Show the Audit Trail**: Open the `AuditLog` table. Show the judges that the failure was perfectly caught, logged, and the state machine cleanly aborted without causing a recursive loop or duplicate payment.

## 4. Closing (Minutes 4:00 - 5:00)
1. **The "Why"**: Reiterate that AI shouldn't just be a wrapper; it must be bound by deterministic fintech rules.
2. **The Result**: Point out the immutable `reasoningTrace` in the `AuditLog`, proving that every AI decision in this system is explainable and compliant.
