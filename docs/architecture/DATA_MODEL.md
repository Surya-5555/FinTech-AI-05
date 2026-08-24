# Data Model Architecture

## Overview
The persistence layer of the Razorpay AI Revenue Recovery system is built on PostgreSQL, managed via Prisma ORM. The data model is strictly normalized and designed to enforce referential integrity, idempotency, and full historical auditability. It operates as the single source of truth for all domain state.

## Core Architectural Patterns

### 1. Unique Constraints as Idempotency Barriers
Financial systems cannot afford duplicate processing. Our data model leverages hard database constraints to guarantee idempotency.
- **Ingestion Table:** The `externalEventId` (e.g., the Razorpay webhook ID) is marked `@unique`. If the system receives a duplicate webhook, the database throws a constraint violation, which the persistence layer safely catches and handles as a successful no-op.
- **Transitions:** State transitions enforce optimistic locking. A case can only transition if its `version` matches the expected state, blocking race conditions between concurrent workers.

### 2. The Core Entities
1. **RevenueEvent (Ingestion):** An immutable, append-only ledger of every raw signal received from payment gateways.
2. **RevenueCase (The Aggregate Root):** The central state machine. A single failed subscription or payment creates one `RevenueCase`. It tracks the amount at risk, the current state (`OPEN`, `PLANNED`, `RECOVERED`, `FAILED`), and the customer context.
3. **RecoveryPlan (The Strategy):** The output of the AI evaluation phase. It contains the causal ML propensity score, the chosen deterministic policy, and the execution constraints.
4. **Intervention (The Execution):** The actual bounded action taken (e.g., SMS sent, webhook fired). It holds foreign keys back to both the `RecoveryPlan` and the `RevenueCase`.
5. **AuditLog (The Ledger):** An append-only table recording every state transition, ML decision, and API action alongside timestamps and correlation IDs.

### 3. JSONB for Extensibility
While core domain fields (IDs, states, amounts) are strictly typed columns, we utilize PostgreSQL's `JSONB` data type for the `metadata` and `payload` columns on `RevenueEvent` and `Intervention`. This allows us to store arbitrary external API responses and contextual variables without requiring a database migration every time Razorpay updates their webhook payload structure, while still allowing for indexed JSON querying if necessary.

### 4. Soft Deletion & Immutability
Records in this system are rarely, if ever, deleted. Instead of `DELETE` operations, we rely on state transitions (`status = 'CANCELLED'`). `RevenueEvent` and `AuditLog` are strictly immutable; `UPDATE` statements are never executed against them in application code.
