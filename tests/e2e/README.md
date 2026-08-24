# End-to-End (E2E) Tests

## Scope

This directory is reserved for true end-to-end tests that exercise the **full system against a live Razorpay test-mode sandbox** — including real webhook delivery, real Razorpay API calls, and real provider communication (Twilio/Resend test credentials).

## Why These Are Not Run in CI

E2E tests in this context require:
1. **Active Razorpay Test-Mode API keys** — not safe to store in CI secrets for an open repo
2. **Twilio/Resend test credentials** — external service dependencies
3. **Manual trigger** — tests involve real (test-mode) money operations that should not run on every push

Running these automatically in CI would:
- Expose API credentials in CI environment variables accessible to forked PRs
- Create non-deterministic test outcomes dependent on Razorpay's sandbox availability
- Risk triggering rate limits on test-mode operations

## What E2E Testing Covers (Manual)

End-to-end verification is performed manually using the `DEMO_SCRIPT.md`:
- Webhook delivery → idempotent case creation
- Planning pipeline → policy gate → intervention queueing
- Worker execution → Razorpay test-mode adapter → outcome persistence
- Full audit trail inspection in the React dashboard

See [`docs/demo/DEMO_SCRIPT.md`](../../docs/demo/DEMO_SCRIPT.md) for the full manual test procedure.

## Integration Tests (CI-Safe)

The **integration tests** in [`tests/integration/`](../integration/) cover the same scenarios against a local Docker PostgreSQL database — with all external provider calls mocked. These run in CI on every push:

```bash
pnpm test:integration
```

Integration tests cover:
- `ai_safety_bounds.test.ts` — AI cannot override policy gates
- `api_ingestion.test.ts` — Webhook idempotency verification
- `recovery_flow.test.ts` — Full recovery pipeline golden path
- `recovery_golden_path.test.ts` — Extended golden path with state machine transitions
- `resilience_flow.test.ts` — Failure recovery scenarios (locks, timeouts, stale states)
