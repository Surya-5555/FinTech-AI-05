# Domain Model

## Bounded Contexts
- Revenue Cases
- Ingestion
- Planning & Policy
- Evaluation

## Key Entities
- `RecoveryCase`: Tracks the lifecycle of revenue at risk.
- `RevenueEvent`: Incoming trigger.
- `RecoveryPlan`: Proposed intervention.
- `InterventionOutcome`: Result of execution.
- `PolicyDecision`: Deterministic outcome of a policy check.

## Invariants
- AI CANNOT change domain state.
- AI CANNOT invoke money actions directly.
- All money uses bigint minor units (`Money`).
- Idempotency keys are deterministic.
