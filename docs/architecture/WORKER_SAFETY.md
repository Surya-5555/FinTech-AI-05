# Worker Safety & Fault Tolerance

## Overview
Background workers in the Razorpay AI Revenue Recovery system are the most critical, yet most volatile components. They interface with unpredictable third-party APIs (Twilio, LLMs, Razorpay webhooks) and operate concurrently. The architecture mandates strict worker safety protocols to prevent financial damage (e.g., spamming a user with 50 duplicate SMS messages).

## Safety Controls

### 1. Absolute Idempotency
Every worker function is designed around the assumption that it will be executed multiple times.
- **Deduplication:** Before dispatching an SMS via Twilio, the worker checks the `Intervention` record in PostgreSQL. If the status is already `SUCCESS`, the worker assumes this is a duplicate BullMQ delivery and returns cleanly without calling Twilio.
- **Idempotency Keys:** When interacting with the Razorpay API to trigger a retry, the worker generates a deterministic `Idempotency-Key` (e.g., `hash(caseId + interventionId)`). If the worker crashes and retries, Razorpay's API will recognize the duplicate key and prevent double-billing.

### 2. Timeouts and Circuit Breakers
Worker execution must not hang indefinitely.
- **API Timeouts:** Every outgoing HTTP request (to LLMs or Twilio) is wrapped in an absolute timeout (e.g., 5 seconds).
- **BullMQ Stalls:** If a worker process dies unexpectedly, BullMQ's stalled job detection will automatically reclaim the job and hand it to a healthy worker after a configured threshold.

### 3. Graceful Degradation
Third-party providers go down. The worker architecture is designed to gracefully degrade:
- If the AI Model (LLM) fails, the worker catches the exception and falls back to a hardcoded, deterministic SMS template.
- If Twilio is down, the job fails gracefully, and BullMQ applies exponential backoff, retrying the intervention hours later rather than hammering a downed API.

### 4. Memory and Resource Constraints
Workers are strictly bounded. They process jobs sequentially or with strict concurrency limits (`concurrency: 5` per node) to prevent event-loop starvation and out-of-memory crashes under heavy load. Database connections are pooled via Prisma, with the pool size calculated based on worker concurrency to prevent database connection exhaustion.
