# AGENTS.md

This document is the permanent operating manual for every coding-agent session in the Razorpay AI Buildathon (Track 03 — AI Revenue Recovery) project. Any agent working on this repository must read this file before modifying anything.

## 1. Project Identity
- **Project:** Razorpay AI Buildathon
- **Track:** 03 — AI Revenue Recovery
- **Core Objective:** Detect revenue at risk, understand why it is at risk, select an appropriate bounded intervention, execute the recovery workflow safely, measure the outcome, and maintain a complete audit trail.
- **What this MUST demonstrate:** AI judgment, deterministic financial safety, evaluation discipline, measurable revenue recovery, graceful failure handling, complete auditability, and production-quality engineering.
- **System Context:** Read `CONTEXT.md` for the full architecture overview, technology stack, and proven system capabilities before making changes.

## 2. Engineering & Architecture Principles
- **Production-First:** Think like a principal engineer working on financial infrastructure. Prioritize correctness, reliability, observability, idempotency, and deterministic execution over superficial complexity.
- **Bounded AI Usage:** AI assists reasoning (classification, prioritization, root-cause interpretation, intervention recommendation, message generation). AI cannot directly control unrestricted money movement.
- **Deterministic Controls:** All financial actions pass through deterministic policy validation, consent validation, idempotency checks, stopping rules, and authorization.
- **Fault Tolerance & Resilience:** Explicitly design for and test external API timeouts, duplicate events, stale states, retry exhaustion, and malformed inputs. Any interaction with an external service or LLM includes error handling, timeouts, and safe fallback states. The system gracefully degrades under all failure conditions.

## 3. Feature Development Workflow
For each meaningful feature, follow this lifecycle:
`UNDERSTAND` -> `DESIGN` -> `IMPLEMENT` -> `TEST` -> `EVALUATE` -> `DOCUMENT` -> `REVIEW` -> `COMMIT` -> `INTEGRATE`

- **Sequential Development:** Everything must be fully functioning and verified in one feature before jumping to the next. Features are completed end-to-end.

1. **Understand & Design:** Identify requirements, interfaces, data flow, failure cases, and safety constraints.
2. **Implement:** Write code adhering to the architecture. AI handles reasoning; deterministic code handles state changes and financial actions.
3. **Test:** Add unit/integration/workflow tests. Explicitly test failure recovery scenarios.
4. **Document:** Documentation is a first-class deliverable. Update feature, architecture, and API docs.
5. **Sync README:** If capabilities, APIs, or evaluation changes, update `README.md` in the *same* cycle.

## 4. Documentation Standards
- **Local Documentation:** For any meaningful feature or change, a markdown documentation file must be created *inside that specific feature's folder itself*. Documentation evolves *with* the implementation.
- Documentation must be completely honest and positive — highlight the capabilities, engineering decisions, and safety guarantees that have been built.
- Place relevant high-level documentation in `docs/architecture/`, `docs/features/`, `docs/decisions/`, `docs/evaluation/`, `docs/operations/`, etc.
- Docs must explain the *engineering reasoning* (Problem, Motivation, Design, Data Flow, AI Involvement, Safety Constraints, Failure Cases).
- **Mermaid Diagrams:** All documentation files include Mermaid diagrams accompanied by `*(or in text format below)*` text equivalents for accessibility.
- **Global `README.md`:** The root `README.md` is the single source of truth. It must ALWAYS be kept perfectly in sync with all local feature docs. It must act as the central documentation hub with detailed explanations of decision choices and the resulting system improvements.

## 5. Coding Standards & Inline Comments
- **Code Quality:** Use clear module boundaries, strict typing, deterministic logic, testable services, clear naming, and minimal hidden state.
- **Strict Typing:** Rely on strict TypeScript throughout. Avoid `any` or untyped dictionaries when schemas are available.
- **Comments:** Write small, helpful inline comments to explain non-obvious logic. Comments must explain the "WHY": non-obvious business rules, safety constraints, idempotency reasoning, retry behavior, or why a simpler approach was rejected.

## 6. Fintech Safety Rules
The system enforces strict financial safety at every layer:
- All AI outputs are validated through Zod schemas before influencing any state transition.
- Execution locks guarantee at-most-once provider API calls.
- Optimistic concurrency control prevents stale state mutations.
- Deterministic stopping rules bound all automation loops.
- Secrets are managed exclusively via environment variables (`.env`) with `.env.example` maintained for reference.

## 7. Evaluation Requirements
Evaluation is a core product feature for Track 03. The system supports reproducible batch evaluation measuring:
- Revenue at risk vs. recovered monetary value.
- Intervention selection accuracy and false intervention cost.
- Escalation rate and stopping-rule compliance.
- Failure recovery success across all 7 documented failure modes.
- All metrics are computed using `BigInt` (minor units) to prevent floating-point precision loss.
- Datasets are checksummed (SHA-256) for reproducibility.

## 8. Git & Commit Standards
- **Branch:** `main` is the primary and only integration branch. All work is committed directly to `main`.
- **Commit Hygiene:** ONE MEANINGFUL DEVELOPMENT UNIT = ONE COMMIT. Commits are made continuously during the workflow.
- **Format:** Use conventional commit messages (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`). Describe *what* meaningful engineering change happened.

## 9. Agent Self-Check Before Starting Work
1. Read this `AGENTS.md` file and `CONTEXT.md` before beginning any task.
2. Inspect `git status` and determine the current branch. Verify `main` is synced.
3. Read relevant documentation and understand the existing architecture.
4. Plan the smallest coherent feature before editing.
5. Execute the feature lifecycle, commit meaningfully as you work, and verify the repository state.
