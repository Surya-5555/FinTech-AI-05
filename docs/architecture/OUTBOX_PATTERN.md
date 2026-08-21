# Transactional Outbox Pattern

## Problem
In a distributed system where the database (PostgreSQL) is the source of truth and a message queue (BullMQ/Redis) is used for async workflow execution, saving a record to the DB and pushing a message to the queue cannot be done in a single distributed transaction. If the DB commits but Redis fails (or vice versa), the system enters an inconsistent state.

## Solution
We use the **Transactional Outbox Pattern**.

1. **Transaction**: Within the same PostgreSQL transaction where we update the `RevenueCase` state and `RecoveryPlan`, we insert an `OutboxEvent` record indicating the intent to enqueue a job.
2. **Commit**: The transaction commits atomically.
3. **Publisher**: A separate `OutboxPublisherService` (running as a cron/interval job) polls the `OutboxEvent` table for `PENDING` records.
4. **Publish**: The Publisher takes a lock, reads the event, and publishes it to BullMQ using a deterministic `jobId`.
5. **Mark Published**: Once BullMQ acknowledges, the `OutboxEvent` is marked `PUBLISHED`.

## Retries & Idempotency
- If the publisher crashes after pushing to BullMQ but before marking it `PUBLISHED` in the DB, it will read it again and publish again. 
- BullMQ's deterministic `jobId` ensures the second push is safely ignored (idempotent enqueue).
- If pushing to BullMQ fails, the publisher applies exponential backoff and retries until a limit is reached, marking it `FAILED`.
