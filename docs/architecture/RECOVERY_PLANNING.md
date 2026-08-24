# Recovery Planning & AI Boundaries

## Overview
The "Intelligence" of the Razorpay AI Revenue Recovery system resides entirely within the Recovery Planning phase. However, to maintain strict fintech safety, we explicitly decouple AI evaluation from policy enforcement. The AI proposes; the deterministic policy engine disposes.

## The Two-Phase Planning Architecture

### Phase 1: AI Evaluation (The Proposal)
When a `RevenueCase` is ingested, it is placed on the `planning-queue`. A worker picks it up and executes the AI evaluation pipeline:
1. **Causal ML Scoring (XGBoost/T-Learner):** The system calculates the Net Expected Intervention Value (Net EIV) using offline-trained models to predict which intervention (SMS, Email, Voice) yields the highest uplift over the control group.
2. **LLM Diagnostics (Claude/GPT):** A strictly prompted LLM analyzes the failure reason (e.g., "insufficient_funds", "card_expired") and generates a personalized, Zod-validated recovery SMS template.
3. **Plan Generation:** The worker combines these insights into a proposed `RecoveryPlan` (e.g., "Send SMS using Template X").

### Phase 2: Deterministic Policy Enforcement (The Gatekeeper)
Before the `RecoveryPlan` is saved or executed, it must pass through the `libs/domain/src/policy.ts` engine. This engine is pure TypeScript (no ML, no LLMs) and enforces absolute financial bounds:
- **Consent Checks:** Does the customer allow SMS? If not, the plan is rejected.
- **Max Attempts:** Has this case already exceeded `MAX_ATTEMPTS_PER_CASE`? If yes, the plan is blocked and the case is closed.
- **Cooldowns:** Was the last intervention sent less than 24 hours ago? If yes, the plan is delayed.
- **Cost Ceilings:** Is the cost of the proposed intervention (e.g., an expensive international voice call) higher than the potential recovered revenue? If yes, the plan is downgraded.

## Failure States
If the AI APIs fail or timeout, the system gracefully degrades. It falls back to a deterministic baseline strategy (e.g., standard email retry) to ensure revenue is not lost due to third-party AI outages. The boundary guarantees that an AI hallucination can never bypass the consent or cooldown checks.
