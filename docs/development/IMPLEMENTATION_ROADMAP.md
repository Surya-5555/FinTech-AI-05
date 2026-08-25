# Implementation Roadmap
**Project:** Razorpay AI Buildathon — Track 03: AI Revenue Recovery

This document outlines the complete sequence for implementing the AI Revenue Recovery system. It ensures that the system is engineered progressively, maintaining strict boundaries between AI reasoning and deterministic execution, and enabling reproducible evaluation of recovery metrics.

---

## 1. Branch, Commit, and Integration Strategy
- **Feature Branches:** All development occurs on isolated feature branches (e.g., `feature/scaffold-backend`, `feature/payment-ingestion`, `feature/risk-engine`).
- **Commit Strategy:** One meaningful development unit = one commit. Commits must be small-to-medium and atomic (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- **Testing & Documentation Strategy:** Tests and documentation (architecture updates, ADRs) must be implemented and committed *on the same feature branch* before integration into `main`.
- **Integration Strategy:** Keep feature branches rebased/merged with the latest `main`. Integrate only when the feature is complete, tested, documented, and the working tree is clean. `main` must remain healthy at all times.

---

## 2. Implementation Phases

### Phase 1: Core Infrastructure & Scaffolding
*Objective: Stand up the fundamental boundaries and services.*
- **Branch:** `feature/project-scaffolding`
- **Features:**
  - Setup NestJS backend modular monolith.
  - Setup Vite/React/TypeScript frontend workspace.
  - Configure PostgreSQL (TypeORM/Prisma schema setup).
  - Configure Redis and BullMQ for async workflows.
  - Docker & Docker Compose orchestration.
- **Dependencies:** None.
- **Testing:** Basic service health checks.

### Phase 2: Domain Model & Payment Event Ingestion
*Objective: Build the deterministic data foundation for revenue at risk.*
- **Branch:** `feature/payment-events`
- **Features:**
  - Database schema for `Merchant`, `PaymentEvent`, `RecoveryWorkflow`, `AuditLog`.
  - Ingestion API/workers to process Razorpay payment events (e.g., `payment.failed`, `subscription.halted`).
  - Idempotency validation at the ingestion layer to prevent duplicate processing.
- **Dependencies:** Phase 1.
- **Testing:** Unit/Integration tests for idempotency, invalid payloads, and DB persistence.

### Phase 3: AI Revenue Risk Engine & Bounded Recovery Planner
*Objective: Introduce AI safely to classify failure context and recommend an action.*
- **Branch:** `feature/recovery-planner`
- **Features:**
  - Strict `LLMClient` abstraction.
  - Risk classification service: analyzes error codes and determines root cause (e.g., insufficient funds vs. bank downtime).
  - Rule-engine constraints: deterministic rules overriding AI recommendations based on retry limits, time bounds, or merchant policies.
- **Dependencies:** Phase 2.
- **Testing:** Test AI failures, fallback mechanisms, deterministic overrides, and malformed LLM responses.

### Phase 4: Deterministic Recovery Execution & Audit
*Objective: Execute the recovery safely and track outcomes.*
- **Branch:** `feature/recovery-executor`
- **Features:**
  - BullMQ processors to execute the chosen intervention (e.g., safe API retry, queuing a localized message).
  - Stopping rules enforcement.
  - Immutable audit trail logging exactly what was decided, by what policy, and the execution outcome.
- **Dependencies:** Phase 3.
- **Testing:** Provider timeouts, retry exhaustion, duplicate recovery prevention, safe degradation.

### Phase 5: Evaluation & Observability Framework
*Objective: Measure the batch-level recovery rate and false-positive interventions.*
- **Branch:** `feature/evaluation`
- **Features:**
  - Scripts/endpoints to feed synthetic historical batches through the engine.
  - Metrics calculation: Revenue at Risk, Recovered Revenue, False Intervention Cost, Escalation Rate.
  - Expose Prometheus metrics endpoint.
- **Dependencies:** Phase 4.
- **Testing:** End-to-end evaluation pipeline over a known synthetic dataset.

### Phase 6: Operator Dashboard (Frontend)
*Objective: Provide visibility into the engine and manual escalation.*
- **Branch:** `feature/operator-dashboard`
- **Features:**
  - React UI to view ingested events, risk scores, and ongoing recovery workflows.
  - UI for human-in-the-loop escalations.
  - Visualization of the evaluation metrics.
- **Dependencies:** Phase 1 (Frontend scaffold), Phase 5 (Metrics).
- **Testing:** Component tests, API integration tests.

### Phase 7: Final Hardening, Failure Recovery Demo, & Submission
*Objective: Finalize the proof-of-work and prepare the demo.*
- **Branch:** `feature/final-hardening`
- **Features:**
  - Verify all documentation matches final implementation.
  - Create the explicit "Failure Recovery Scenario" (e.g., triggering a simulated provider timeout and demonstrating safe recovery).
  - Finalize the root `README.md` setup/demo instructions.
- **Dependencies:** All previous phases.

---

## 3. Evaluation & Demo Readiness
By Phase 7, the project must demonstrate:
1. **Measured Recovery:** Batch evaluation clearly showing total money recovered.
2. **Fintech Safety:** Audit trails proving that AI never directly triggered an unbounded financial action.
3. **Failure Recovery:** A reproducible example of "what broke and how we got out" (e.g., handling duplicate webhooks or timeouts).
