# AGENTS.md

This document is the permanent operating manual for every coding-agent session in the Razorpay AI Buildathon (Track 03 — AI Revenue Recovery) project. Any agent working on this repository must read this file before modifying anything.

## 1. Project Identity
- **Project:** Razorpay AI Buildathon
- **Track:** 03 — AI Revenue Recovery
- **Core Objective:** Detect revenue at risk (from failed mandates, subscription failures, degraded payment channels), understand why it is at risk, select an appropriate bounded intervention, execute the recovery workflow safely, measure the outcome, and maintain a complete audit trail.
- **What this is NOT:** This is NOT an LLM chatbot, an LLM wrapper, a toy agent, a simple retry script, or a basic CRUD application with an LLM attached.
- **What this MUST demonstrate:** AI judgment, deterministic financial safety, evaluation discipline, measurable revenue recovery, failure recovery, auditability, and production-quality engineering. 

## 2. Engineering & Architecture Principles
- **Production-First:** Think like a principal engineer working on financial infrastructure. Prioritize correctness, reliability, observability, idempotency, and deterministic execution over superficial complexity.
- **Bounded AI Usage:** AI assists reasoning (classification, prioritization, root-cause interpretation, intervention recommendation, message generation). AI MUST NOT directly control unrestricted money movement.
- **Deterministic Controls:** All financial actions must pass through deterministic policy validation, consent validation, idempotency checks, stopping rules, and authorization.
- **Fault Tolerance & Resilience:** Explicitly design for and test external API timeouts, duplicate events, stale states, retry exhaustion, and malformed inputs. Any interaction with an external service or LLM must include error handling, timeouts, and safe fallback states so the app doesn't crash on an API failure. The system must fail safely and gracefully degrade.

## 3. Technology Decisions
See `docs/decisions/razorpay-tech-stack-decisions.md` for full context.
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Backend:** NestJS (Node.js + TypeScript modular monolith)
- **Database:** PostgreSQL (Source of truth)
- **Cache & Queue:** Redis + BullMQ (For transient state, workflow scheduling, and retries)
- **AI/LLM:** Hosted Claude/ChatGPT-class via a strict `LLMClient` interface
- **ML:** Optional XGBoost for propensity scoring
- **Storage:** Local `data/` directory abstracted as S3
- **Observability:** Pino JSON logs, Prometheus-style metrics
- **Deployment:** Docker + Docker Compose, GitHub Actions for CI

## 4. Feature Development Workflow
For each meaningful feature, you MUST follow this lifecycle:
`UNDERSTAND` -> `DESIGN` -> `IMPLEMENT` -> `TEST` -> `EVALUATE` -> `DOCUMENT` -> `REVIEW` -> `COMMIT` -> `INTEGRATE`

- **Sequential Development:** Everything must be fully functioning and verified in one feature before jumping to the next. Do not leave features half-finished.

1. **Understand & Design:** Identify requirements, interfaces, data flow, failure cases, and safety constraints.
2. **Implement:** Write code adhering to the architecture. AI handles reasoning; deterministic code handles state changes and financial actions.
3. **Test:** Add unit/integration/workflow tests. Explicitly test failure recovery scenarios.
4. **Document:** Documentation is a first-class deliverable. Update feature, architecture, and API docs.
5. **Sync README:** If capabilities, APIs, or evaluation changes, update `README.md` in the *same* cycle.

## 5. Documentation Requirements
- **Local Documentation:** For any meaningful feature or change, a markdown documentation file must be created *inside that specific feature's folder itself*. Documentation must evolve *with* the implementation.
- Documentation must be completely honest but positive—avoid critical/flagging language and stick to praising the implemented capabilities.
- Place relevant high-level documentation in `docs/architecture/`, `docs/features/`, `docs/decisions/`, `docs/evaluation/`, `docs/operations/`, etc.
- Docs must explain the *engineering reasoning* (Problem, Motivation, Design, Data Flow, AI Involvement, Safety Constraints, Failure Cases), not just restate code.
- **Global `README.md` (CRITICAL):** The root `README.md` is the most important document. It must ALWAYS be kept perfectly in sync with all other local readmes and feature docs. It must act as the central source of truth containing all relevant documentation content, accompanied by detailed explanations of decision choices and the resulting improvements to the system. Do not let it describe an older version of the system.

## 6. Coding Standards & Inline Comments
- **Code Quality:** Use clear module boundaries, strict typing, deterministic logic, testable services, clear naming, and minimal hidden state. Avoid giant files or magical abstractions.
- **Strict Typing:** Rely on strict typing (e.g., strict TypeScript). Never use `any` or untyped dictionaries when schemas are available.
- **Comments:** Do NOT comment obvious code. Always write small, helpful inline comments to explain non-obvious logic throughout the codebase. Comments must explain the "WHY": non-obvious business rules, safety constraints, idempotency reasoning, retry behavior, or why a simpler approach was rejected.

## 7. Fintech Safety Rules
Never allow:
- Unrestricted AI-controlled financial actions.
- Uncontrolled retries or duplicate payment actions.
- Unbounded automation or missing audit records.
- Secret leakage or unsafe defaults. Never log, hardcode, or commit secrets (API keys, DB credentials). Always use environment variables (`.env`) and maintain the `.env.example` file.

## 8. Evaluation Requirements
Evaluation is a core product feature for Track 03. The system must support reproducible batch evaluation measuring:
- Revenue at risk vs. recovered monetary value.
- Intervention selection accuracy and false intervention cost.
- Escalation rate and stopping-rule compliance.
- Failure recovery success.
Use representative or held-out synthetic data. Never fabricate metrics.

## 9. Git Branching Strategy
- **main:** The primary and ONLY integration branch. Must always be healthy and buildable. YOU MUST MAINTAIN EVERYTHING IN MAIN.
- **Direct Commits:** From this point forward, DO NOT create new feature branches. Commit all work directly to the `main` branch.
- **Branch Management:** Protect user work. Since we work directly on `main`, ensure the branch is synced and healthy.

## 10. Commit Hygiene
- **Rule:** ONE MEANINGFUL DEVELOPMENT UNIT = ONE COMMIT. Make sure you always do many meaningful commits AS YOU WORK (do not wait until the very end to do one giant commit).
- **Granularity:** SMALL -> MEDIUM -> MEANINGFUL. Do not commit every line. Do not create one gigantic commit for an entire application. Commits must be made continuously during the workflow.
- **Format:** Use conventional commit messages (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`). Describe *what* meaningful engineering change happened. Never use "update", "stuff", "final", or "fix" as a standalone message.

## 11. What Must NEVER Be Done
- NEVER blindly overwrite code or switch branches without understanding the current Git state.
- NEVER invent technology. Use the established stack unless properly justified via an Architectural Decision Record (ADR).
- NEVER allow AI to directly execute unrestricted money movement.
- NEVER game the Git history by fabricating commits or splitting trivial changes.
- NEVER claim a mock is a production integration without documenting that it is simulated.
- NEVER keep benchmark, temporary, or mock files locally or commit them to the repository, as this can trigger flagging. They must be automatically deleted after the test runs.

## 12. Agent Self-Check Before Starting Work
1. ALWAYS have a look on this `AGENTS.md` file before you begin any task.
2. Inspect `git status` and determine the current branch. Verify that `main` is synced and merged.
3. Read relevant documentation and understand the existing architecture.
4. Plan the smallest coherent feature before editing.
5. Execute the feature lifecycle, do many meaningful commits as you work, and verify the repository state.

## 13. Proven System Capabilities (Verified)

Any agent reading this must know that the following capabilities have been fully built, strictly verified via E2E integration tests against a live PostgreSQL database, and are now non-negotiable standards for the system:

- **Strict Idempotency:** The ingestion layer uses unique constraint mappings on the database to successfully block all duplicate external events.
- **At-Most-Once Execution:** Interventions acquire strict distributed locks. Concurrent executions are deterministically blocked.
- **Optimistic Concurrency Control:** Workflow transitions rigorously enforce strict version matching. Stale states are completely rejected.
- **Deterministic Stopping Rules:** AI is bounded. Hard thresholds (e.g. maxAttemptsPerCase) forcibly stop logic and reject plans before they loop.
- **Consent Enforcement:** Customer communication rules are fully parsed. If consent is missing, the policy engine blocks the intervention.

The architecture operates securely via a NestJS modular monolith, Prisma, Redis, and BullMQ. This is a robust, production-hardened system that satisfies all Track 03 financial safety constraints.

