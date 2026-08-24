# ADR-003: Redis and BullMQ for Asynchronous Workloads

**Status:** Accepted
**Date:** 2026-08-02
**Context:** Asynchronous Execution Architecture

## Context and Problem Statement
Recovering failed revenue requires interacting with third-party APIs (LLMs for planning, Twilio/Resend for execution, Razorpay for status checks). These APIs are subject to latency, rate limits, and outages. Handling these inline during an HTTP request would lead to timeouts and dropped recoveries. The system requires a highly reliable, distributed task queue to decouple webhook ingestion from execution.

## Decision
We will use **Redis** combined with **BullMQ** to manage all background processing, scheduling, and job retries.

## Rationale
1. **At-Least-Once Delivery:** BullMQ guarantees that jobs are not lost if a worker crashes during execution. Stalled jobs are automatically reclaimed and retried.
2. **Advanced Job Lifecycle:** BullMQ natively supports the exact features required by our domain:
   - **Exponential Backoff:** Automatically retrying failed external API calls with increasing delays.
   - **Delayed Jobs:** Essential for scheduling follow-up checks or enforcing cooldown periods between interventions.
   - **Concurrency Control:** Limiting the number of concurrent LLM API calls to respect provider rate limits.
3. **Decoupled Topologies:** We can easily spin up dedicated queues (`planning-queue`, `execution-queue`, `reconciliation-queue`) and scale the worker nodes for each independently based on CPU/IO profiles.

## Consequences
- Redis becomes a critical piece of infrastructure, though it is not the *source of truth*. (The PostgreSQL outbox guarantees that even if Redis is wiped, jobs can be re-enqueued).
- Workers must be strictly idempotent, as BullMQ ensures at-least-once (not exactly-once) delivery.
