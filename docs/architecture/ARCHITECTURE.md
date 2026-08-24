# System Architecture Overview

## The Razorpay AI Revenue Recovery System

This directory contains the detailed architectural blueprints for the Razorpay AI Revenue Recovery (Track 03) platform. The system is built as a highly resilient, event-driven Modular Monolith designed for strict financial safety and deterministic execution.

### Architectural Documents

Below is the directory of all architectural subsystems:

1. **[API Foundation](API_FOUNDATION.md):** The strict HTTP delivery and validation boundary using NestJS and Zod.
2. **[Data Model](DATA_MODEL.md):** The PostgreSQL schema, uniqueness constraints, and JSONB strategies.
3. **[Domain Model](DOMAIN_MODEL.md):** The tactical DDD implementation, isolating business logic from external frameworks.
4. **[State Machine](STATE_MACHINE.md):** The rigid, DAG-based state transitions governing a revenue recovery lifecycle.
5. **[Persistence](PERSISTENCE.md):** The Repository pattern implementation via Prisma and transactional guarantees.
6. **[Async Workflow](ASYNC_WORKFLOW.md):** The BullMQ/Redis worker topologies and asynchronous queuing strategy.
7. **[Outbox Pattern](OUTBOX_PATTERN.md):** The transactional outbox guaranteeing exactly-once delivery across Postgres and Redis.
8. **[Recovery Planning](RECOVERY_PLANNING.md):** The strict boundary between AI (Causal ML/LLMs) and Deterministic Policy enforcement.
9. **[Worker Safety](WORKER_SAFETY.md):** Fault tolerance, idempotent execution, and graceful degradation in background jobs.
10. **[Error Model](ERROR_MODEL.md):** The global, deterministic JSON error classification strategy.
11. **[Observability Foundation](OBSERVABILITY_FOUNDATION.md):** Structured Pino logging, Prom-client metrics, and cross-boundary correlation IDs.

## Core Architectural Principles

- **Deterministic Over Smart:** AI is used strictly for advisory evaluation (scoring, templating). All final decisions and state mutations are guarded by deterministic TypeScript policies.
- **Idempotency Everywhere:** From unique webhooks in Postgres to Redis-locked worker execution, the system mathematically prevents duplicate financial operations.
- **Graceful Degradation:** If the LLM goes down, or the ML server is unreachable, the system falls back to standard retry logic. The architecture never fails open.
