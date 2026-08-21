# ADR 012: Redis/BullMQ with Transactional Outbox for Async Workflows

## Status
Accepted

## Context
Phase 3 requires durable asynchronous execution for recovery plans. We need a way to schedule jobs and ensure they run reliably, supporting retries and idempotency.

## Decision
- We use **Redis** and **BullMQ** as the asynchronous job queue. 
- We use the **Transactional Outbox Pattern** with PostgreSQL to ensure atomic enqueue intents.

## Rationale
- **BullMQ**: Lightweight, robust Node.js queue system supporting retries, delays, and exponential backoff natively. Fits the NestJS ecosystem perfectly (`@nestjs/bullmq`).
- **Redis vs Kafka**: While Kafka offers robust event sourcing, Redis + BullMQ is significantly simpler to run locally (via Docker) and covers all requirements for our job execution model.
- **Outbox Pattern**: Because Redis and Postgres cannot participate in a 2-phase commit (2PC), saving business state (Postgres) and dispatching a job (Redis) risks inconsistency. The outbox table guarantees at-least-once delivery to BullMQ.

## Consequences
- The Worker app (`apps/worker`) must be resilient to duplicate job deliveries from BullMQ (idempotency checks).
- We must maintain an outbox publisher process/timer in the API or Worker to forward intents to Redis.
