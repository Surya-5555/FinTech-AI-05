# Evidence Map

Requirement → Code → Test → Documentation → Demo Moment

## 1. Event Ingestion & Duplicate Detection

| Layer | Evidence |
|-------|---------|
| **Requirement** | Ingest failed payment events, reject duplicates |
| **Code** | `apps/api/src/modules/events/events.controller.ts` — `POST /events/ingest` with idempotency key |
| **Schema** | `libs/persistence/prisma/schema.prisma` — `@@unique([merchantId, externalEventId, eventType])` |
| **Test** | `tests/integration/recovery_flow.test.ts` — duplicate ingestion returns conflict |
| **E2E Test** | `apps/api/test/events.e2e.test.ts` — validates ingestion endpoint |
| **Documentation** | `docs/failures/FAILURES.md` § Duplicate Event Ingestion |
| **Demo** | Demo Script 1:15–2:30 — ingest event, then re-send same event showing 400 rejection |

## 2. Revenue Case Creation & State Machine

| Layer | Evidence |
|-------|---------|
| **Requirement** | Create revenue-at-risk cases, enforce state transitions |
| **Code** | `apps/api/src/modules/cases/cases.service.ts`, `libs/domain/src/state-machine.ts` |
| **Schema** | `libs/persistence/prisma/schema.prisma` — `RevenueCase` with `state`, `version` fields |
| **Test** | `tests/integration/recovery_flow.test.ts` — case created in `DETECTED` state |
| **Documentation** | `docs/architecture/STATE_MACHINE.md` |
| **Demo** | Demo Script 1:15–2:30 — case appears in console with `DETECTED` status |

## 3. Recovery Planning & Policy Validation

| Layer | Evidence |
|-------|---------|
| **Requirement** | Plan bounded recovery interventions, validate against merchant policy and customer consent |
| **Code** | `libs/domain/src/planning.ts`, `libs/domain/src/policy.ts` |
| **API** | `apps/api/src/modules/planning/planning.controller.ts` — `POST /cases/:caseId/plans` |
| **Test** | `apps/api/test/planning.e2e.test.ts` — plan creation with auth |
| **Documentation** | `docs/architecture/RECOVERY_PLANNING.md` |
| **Demo** | Demo Script 1:15–2:30 — create plan, view in case detail |

## 4. Intervention Execution & At-Most-Once Guarantee

| Layer | Evidence |
|-------|---------|
| **Requirement** | Execute interventions safely, prevent double execution |
| **Code** | `apps/worker/src/processors/recovery-plan-execution.processor.ts` |
| **Lock** | `libs/persistence/src/repositories/execution.repository.ts` — `claimExecutionLock()` |
| **Test** | `tests/integration/resilience_flow.test.ts` — lock prevents double execution |
| **Documentation** | `docs/failures/FAILURES.md` § Concurrent Execution |
| **Demo** | Demo Script 3:25–4:20 — explain lock acquisition and rejection |

## 5. Stopping Rules & Escalation

| Layer | Evidence |
|-------|---------|
| **Requirement** | Halt automation after max attempts, escalate |
| **Code** | `libs/domain/src/state-machine.ts` — `escalate()` transition |
| **Test** | `tests/integration/resilience_flow.test.ts` — case transitions to `ESCALATED` with audit |
| **Documentation** | `docs/failures/FAILURES.md` § Workflow Exhaustion |
| **Demo** | Demo Script 3:25–4:20 — show `ESCALATION_TRIGGERED` audit log |

## 6. AI Decision Support (Bounded)

| Layer | Evidence |
|-------|---------|
| **Requirement** | AI diagnoses root cause and drafts customer messages, cannot execute actions |
| **Code** | `apps/api/src/modules/ai/ai.controller.ts`, `libs/llm/src/client/llm.client.ts` |
| **Fallback** | `libs/llm/src/fallbacks/templates.ts` — deterministic templates when LLM unavailable |
| **Prompts** | `libs/llm/src/prompts/decision-explanation.v1.ts`, `recovery-message.v1.ts` |
| **Test** | `apps/api/test/security.e2e.test.ts` — LLM malformed output rejected by ValidationPipe |
| **Documentation** | `docs/security/SECURITY.md` § AI / Tool Boundary |
| **Demo** | Demo Script 4:20–5:00 — `POST /cases/:id/message-draft`, `GET /ai/health` |

## 7. Evaluation Framework

| Layer | Evidence |
|-------|---------|
| **Requirement** | Reproducible batch metrics, baseline comparison, integrity assertions |
| **Code** | `libs/evaluation/src/metrics/calculator.ts` — `MetricsCalculator.compute()` |
| **Baselines** | `libs/evaluation/src/baselines/` — Baseline 0 (no recovery), Baseline 1 (naive retry) |
| **Dataset** | `data/evaluation/v1/` — 500 synthetic cases, seed 42, SHA-256 checksummed |
| **Integrity** | `libs/evaluation/src/metrics/integrity.ts` — rejects recovered > at-risk |
| **Command** | `pnpm evaluate-smoke` |
| **Documentation** | `docs/evaluation/EVALUATION.md` |
| **Demo** | Demo Script 2:30–3:25 — run evaluation, show metrics |

## 8. Security Boundaries

| Layer | Evidence |
|-------|---------|
| **Requirement** | Auth on mutations, input validation, secrets management |
| **Code** | `apps/api/src/common/guards/operator-auth.guard.ts` |
| **Config** | `apps/api/src/config/configuration.ts` — fail-closed on missing credentials |
| **Logging** | `apps/api/src/app.module.ts` — Pino redaction of auth headers |
| **Test** | `apps/api/test/security.e2e.test.ts` — 401 on missing/invalid token, 200 on valid |
| **Documentation** | `SECURITY.md`, `docs/security/SECURITY.md` |
| **Demo** | Demo Script 4:20–5:00 — show auth rejection |

## 9. Operations Console

| Layer | Evidence |
|-------|---------|
| **Requirement** | Visual transparency for reviewer — cases, audit trails, evaluation |
| **Code** | `apps/frontend/src/features/` — Dashboard, Cases, CaseDetail, Evaluation, Failures pages |
| **API Integration** | `apps/frontend/src/api/client.ts` — REST client |
| **URL** | `http://localhost:5173` |
| **Documentation** | `README.md` § Architecture |
| **Demo** | Visible throughout the entire demo — every screen maps to a backend API |

## 10. External Adapter Resilience

| Layer | Evidence |
|-------|---------|
| **Requirement** | Graceful handling of Razorpay/Twilio/Resend failures |
| **Code** | `apps/worker/src/providers/razorpay/razorpay.adapter.ts` |
| **Test** | `tests/integration/resilience_flow.test.ts` — unsupported action → `CONFIGURATION_ERROR` |
| **Documentation** | `docs/failures/FAILURES.md` § External Adapter Failure |
| **Demo** | Demo Script 3:25–4:20 — adapter failure scenario |
