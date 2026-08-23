# MASTER IMPLEMENTATION CHECKLIST
# Razorpay AI Revenue Recovery

This is the living execution control plane. The system is complete when all feasible items are verified.

## CURRENT STATUS
Total: 7
Completed: 7
Verified: 7
In Progress: 0
Blocked: 0
Not Needed: 0

---

## 1. P0 SECURITY & COMPLIANCE

### [V] 1.1 Webhook Signature Verification (HMAC SHA256)
- **Status:** VERIFIED
- **Files Affected:** `apps/api/src/modules/events/events.controller.ts`, `apps/api/src/common/guards/razorpay-webhook.guard.ts`
- **Description:** Implement crypto HMAC validation against `x-razorpay-signature`.
- **Tests:** Integrated into `recovery_golden_path.test.ts` and `security.e2e.test.ts`. All 35 tests passing.

### [V] 1.2 PII Encryption at Rest
- **Status:** VERIFIED
- **Files Affected:** `libs/persistence/prisma/schema.prisma`, `libs/domain/src/customer.ts`, `libs/utils/src/encryption.ts`
- **Description:** Implement Application-Layer AES-256-GCM encryption for Customer `email` and `phone` before writing to DB.
- **Tests:** Database verifies ciphertext insertion on Ingestion. Tested via E2E test passes.

---

## 2. P0 FINTECH RESILIENCE

### 2. Fintech Resilience & Safety (Agent Execution Required)
- [x] **2.1 Provider Reconciliation Worker**
  - **Issue:** Mock adapter simulates timeouts, but system doesn't robustly handle them.
  - **Requirement:** If provider times out, intervention must go to `AMBIGUOUS` state.
  - **Requirement:** A dedicated `ReconciliationQueue` processor must poll the provider after a delay to finalize the status before any retry is allowed.
  - **Status:** **COMPLETE**. Added `AMBIGUOUS` state handling, `ReconciliationProcessor`, and chaos tests verifying 50% timeouts resolve correctly.
- **Tests:** Chaos tests returning 50% timeouts must perfectly resolve to final state with zero duplicate creations.

---

## 3. P1 ARCHITECTURE & DATA

- [x] **3.1 Real HTTP Provider Adapter**
  - **Status:** **COMPLETE**
  - **Files Affected:** `apps/worker/src/providers/razorpay/razorpay.adapter.ts`
  - **Description:** Replaced Razorpay SDK with Axios. Implemented exponential backoff with `axios-retry`, circuit breaking with `opossum`, and precise mapping of HTTP errors to bounded `ExternalActionErrorCode` values.

- [x] **3.2 Outbox Relay Evolution**
  - **Status:** **COMPLETE**
  - **Files Affected:** `apps/api/src/modules/outbox-publisher/outbox-publisher.service.ts`
  - **Description:** Moved away from `setInterval` polling towards `LISTEN/NOTIFY` (pg_notify) to drop DB CPU contention. Using dedicated pg client in NestJS service.

- [x] **3.3 Shadow ML Propensity Pipeline**
  - **Status:** **COMPLETE**
  - **Files Affected:** `libs/domain/src/ml/propensity.ts`, `libs/domain/src/planning.ts`
  - **Description:** Implemented a simulated XGBoost propensity inference model to prove the architectural boundary. The ML service operates strictly in "shadow mode", appending probability scores (`p(Retry)`, `p(Link)`) to the diagnosis for offline evaluation without overriding the deterministic domain rules.

---

## 4. P2 PRODUCT MATURITY

- [x] **4.1 Operations Dashboard Hardening**
  - **Status:** **COMPLETE**
  - **Files Affected:** `apps/api/src/modules/cases/cases.controller.ts`, `apps/api/src/modules/cases/cases.service.ts`, `apps/frontend/src/features/cases/CasesPage.tsx`
  - **Description:** Implemented cursor-based pagination for high-performance querying of the RevenueCase table, replacing offset pagination. Replaced mocked API routes with real NestJS integrations, and exposed merchant isolation filtering controls in the frontend dashboard.

---

## LATEST VERIFIED TESTS
`pnpm test:integration` (36 passing tests)
`pnpm evaluate-smoke` (Golden path success)

## LATEST COMMITS
`91c3fc5` feat: complete target architecture implementation including outbox relay, shadow ML, and cursor pagination
`7b6c56a` docs: update README and checklist with completed implementations
