# Transactional Outbox Pattern

## Overview
In distributed microservices, a common failure mode is updating a database successfully, but crashing before sending the corresponding event to a message broker (or vice versa). To guarantee exactly-once message delivery semantics and maintain absolute consistency between our PostgreSQL database and our Redis queues, the Razorpay AI Revenue Recovery system implements the **Transactional Outbox Pattern**.

## How It Works

### 1. The Transactional Write
When a domain action occurs (e.g., an API controller accepts a webhook and creates a `RevenueEvent`), the application must enqueue a job for the worker to process it. Instead of pushing to Redis directly:
1. The system opens a PostgreSQL transaction.
2. It inserts the `RevenueEvent` record.
3. It inserts an `OutboxMessage` record (containing the event payload and target queue name) into a dedicated `outbox` table.
4. It commits the transaction.

If the database crashes midway, both the state change and the event are rolled back. If it succeeds, both are guaranteed to be persisted.

### 2. The Outbox Relay (Sweeper)
A dedicated, lightweight background process (the Relay) continuously polls the `outbox` table for unprocessed messages (where `processedAt IS NULL`).
1. It reads a batch of messages.
2. It pushes them to the respective BullMQ queues (Redis).
3. It marks the messages as `processedAt = NOW()` in the database.

## Resilience Guarantees
- **Redis Outages:** If Redis is down, the API continues to function normally (accepting webhooks and saving them to the outbox). Once Redis recovers, the Outbox Relay immediately catches up and flushes the backlog.
- **Relay Crashes:** If the Relay process crashes after pushing to Redis but before marking the message as processed in Postgres, it will read the message again upon restart and push it to Redis a second time.
- **Idempotency Requirement:** Because the Relay guarantees at-least-once delivery (due to potential crashes as described above), the BullMQ workers are strictly designed to be idempotent, ignoring duplicate messages based on the unique event ID.
