# AGENT.md: Engineering Constitution

This document governs the engineering rules, architecture principles, and development workflow for the Razorpay AI Buildathon (Track 03 — AI Revenue Recovery) project. It is the permanent engineering instruction document for all agents and developers working on this repository.

## 1. Project Mission
We are building a production-oriented AI Revenue Recovery system for Razorpay merchants (Track 03 of the Razorpay AI Buildathon).
- **The Business Problem:** Merchants lose significant revenue due to failed payment mandates, degraded payment channels, and abandoned checkouts. 
- **What "Revenue Recovery" Means:** Identifying "at-risk" revenue from payment events and automatically executing bounded intervention workflows (such as retrying a mandate, sending localized Hinglish payment links, or escalating to human review) to recover funds safely and efficiently.
- **Evaluation Expectations:** The system will be evaluated not as a prototype, but as a robust fintech application. It must demonstrate batch-level metrics for money recovered, intervention precision (cost of false positives/negatives), escalation rates, and stopping-rule compliance.
- **Safety & Measurability:** In a financial environment, unrestricted AI execution is dangerous. Our system must rely on deterministic rules for execution while using AI strictly for bounded reasoning.

## 2. Engineering Philosophy
- **Production-First Engineering:** We engineer for correctness, reliability, and maintainability over superficial complexity.
- **Deterministic Financial Execution:** Financial actions must be governed by explicit, tested code, not LLM generations.
- **Bounded AI:** AI assists reasoning; the application controls execution.
- **Observable & Auditable:** All interventions must produce an immutable audit trail and structured logs.
- **Fault-Tolerant & Recoverable:** The system must gracefully handle provider timeouts, duplicate events, and stale states.

## 3. Architecture Principles
- **Domain Boundaries:** Clear separation between payment event ingestion, revenue risk scoring, recovery orchestration, and communication.
- **Data Ownership:** PostgreSQL is the durable source of truth for business-critical state. Redis is used only for queues and short-lived workflow state.
- **Asynchronous Processing:** Interventions and third-party API calls are managed via durable queues (Redis + BullMQ) to support retries and isolation.
- **AI Decision Boundaries:** AI models are used for classification, prioritization, root-cause interpretation, and generating customer-facing messages. AI must *never* directly execute unrestricted money movement or bypass authorization.

## 4. Technology Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS [PROJECT DECISION] - Fast, maintainable, widely supported.
- **Backend:** NestJS (Node.js + TypeScript) modular monolith [PROJECT DECISION] - Enforces strong architectural boundaries, aligns with Razorpay's Node SDK ecosystems.
- **Database:** PostgreSQL [VERIFIED] - Razorpay utilizes relational stores heavily for ACID compliance.
- **Cache & Queue:** Redis + BullMQ [VERIFIED] - Razorpay is a documented Redis customer; BullMQ provides robust async scheduling and retries.
- **AI/LLM:** Hosted Claude/ChatGPT-class via an abstracted `LLMClient` [VERIFIED] - Aligns with Razorpay Agent Studio usage; high accuracy for text and structured output.
- **ML (Optional):** XGBoost for propensity scoring [VERIFIED] - Razorpay Mitra utilizes XGBoost for streaming risk.
- **Storage:** Local `data/` abstracted as S3 [PROJECT DECISION] - Simple for the Buildathon but architecturally ready for cloud object storage.
- **Observability:** Pino JSON logs + Prometheus metrics [PROJECT DECISION] - Standard scalable observability pattern.
- **Deployment:** Docker + Docker Compose [PROJECT DECISION] - Ensures reproducible environments.
- **CI/CD:** GitHub Actions [VERIFIED] - Standard CI approach seen in Razorpay open source repos.

## 5. Fintech Safety Rules
All financial actions and recovery workflows must be:
- **Idempotent:** Prevent duplicate actions for the same failure event.
- **Bounded:** Enforce strict stopping rules and maximum retry limits.
- **Deterministic:** State transitions must be governed by code, not LLM behavior.
- **Recoverable:** System must handle timeouts, race conditions, partial execution, and provider failures gracefully.

## 6. AI Engineering Boundaries
- **WHERE AI IS USED:** Prioritization of recovery efforts, root-cause classification (e.g., parsing error codes), generating personalized Hinglish messaging, summarizing recovery cases for operator escalation.
- **WHERE AI IS NOT USED:** Validating limits, authorizing API calls, tracking idempotency, executing state transitions, or invoking Razorpay APIs directly without a deterministic control layer. All AI outputs must be validated before use.

## 7. Testing & Evaluation
- **Testing Layers:** Unit, integration, workflow, and failure-scenario tests. We must explicitly test for duplicate events, stale states, provider timeouts, and invalid AI responses.
- **Evaluation:** Reproducible batch evaluation metrics must track: Revenue at Risk, Revenue Recovered, False Intervention Cost, Escalation Rate, and Workflow Completion.

## 8. Documentation Standards
- **First-Class Citizen:** Documentation must explain *engineering reasoning*, not just what the code does. 
- **Terminology:** Use terms like `idempotent`, `deterministic`, and `auditable` ONLY when the implementation justifies it.
- **Inline Comments:** Document the "WHY" (e.g., invariants, safety constraints, tradeoffs, failure handling), not the "WHAT".
- **Keep Sync'd:** Documentation (Architecture, Decisions, Evaluation) must be updated in the same commit as the implementation change.

## 9. Git Commit & Branch Hygiene
- **Commit Philosophy:** ONE MEANINGFUL DEVELOPMENT UNIT = ONE COMMIT. Do not commit every line; do not dump the whole project in one commit. The git history must tell the story of how the engineering evolved.
- **Commit Messages:** Use Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`). Ensure messages precisely describe the engineering change.
- **Feature Branches:** Use descriptive branches (e.g., `feature/revenue-risk-engine`, `fix/duplicate-recovery`). 
- **Branch Synchronization:** Keep feature branches updated. Rebase or safe merge from `main` before integration. Keep `main` as the stable, buildable truth.
- **Protect Work:** Never blindly switch branches or reset without inspecting `git status` to ensure user work is not lost.

*Note: If an implementation requires a change to these architectural principles, an Architectural Decision Record (ADR) must be written and this document updated.*
