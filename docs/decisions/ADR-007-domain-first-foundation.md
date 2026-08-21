# ADR 007: Domain First Foundation

## Context
We need a safe, robust foundation for fintech operations that isolates AI logic from financial state changes.

## Decision
- Implement pure domain logic before any external I/O.
- Money uses bigint minor units to prevent float precision issues.
- State transitions are heavily guarded to enforce invariants.
- Policy decisions are 100% deterministic and synchronously executable without side effects.
