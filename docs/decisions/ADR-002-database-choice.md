# ADR-002: PostgreSQL as Primary Datastore

**Status:** Accepted
**Date:** 2026-08-01
**Context:** Infrastructure Setup

## Context and Problem Statement
The system handles financial data (Revenue events, recovery plans, and intervention outcomes). It requires absolute consistency, ACID guarantees, and strict relational integrity to prevent race conditions or duplicate billing. NoSQL stores (like MongoDB) do not natively provide the relational guarantees required for financial state machines without complex application-layer locking.

## Decision
We will use **PostgreSQL 16** as the primary relational database and the ultimate source of truth for all domain state.

## Rationale
1. **ACID Compliance:** Essential for the `RevenueCase` state machine. Transitions from `OPEN` -> `EXECUTING` must be strictly transactional.
2. **Idempotency Constraints:** PostgreSQL allows us to define rigid `@unique` constraints on combinations of fields (e.g., `merchantId`, `externalEventId`, `eventType`) to mathematically prevent duplicate webhooks from corrupting the system, offloading deduplication from the application to the database engine.
3. **JSONB Flexibility:** While the core financial schema is rigid, PostgreSQL's `JSONB` data type allows us to store arbitrary, unpredictable webhook payloads, AI evaluation metadata, and dynamic reason codes without requiring schema migrations.
4. **Optimistic Concurrency Control (OCC):** Relational databases perfectly support version-based locking, ensuring that concurrent workers processing the same `RevenueCase` do not overwrite each other's state.

## Consequences
- Requires rigorous schema management and migration tracking (handled via Prisma).
- High write-throughput must be managed carefully, utilizing the Transactional Outbox pattern rather than distributed two-phase commits.
