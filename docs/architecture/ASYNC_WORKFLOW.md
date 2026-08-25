# Asynchronous Workflow & Queue Architecture

## Overview
To ensure system resilience, strict timeouts, and decoupled execution, all heavy processing (AI evaluation, external SMS dispatch, Razorpay API calls) occurs asynchronously. The system relies on **BullMQ** (backed by Redis) as the enterprise-grade task queue for distributing workloads across horizontally scalable worker nodes.

## Queue Topologies
The system segregates workloads into dedicated queues to prevent noisy-neighbor issues and ensure critical tasks are prioritized:
1. **`planning-queue`**: Handles the AI evaluation phase (invoking LLMs/XGBoost to determine the optimal recovery strategy). This is compute-heavy.
2. **`execution-queue`**: Handles the actual dispatch of SMS, Voice, or Email via external providers. This is network-heavy and prone to timeouts.
3. **`reconciliation-queue`**: Periodically checks Razorpay for unresolved cases or stale states.

## Worker Resilience

### 1. Exponential Backoff & Retries
External APIs (like Twilio, Resend, or Razorpay) fail. The BullMQ workers are configured with automatic retry policies using exponential backoff (e.g., 3 retries, starting at 5s, then 25s, then 125s). If a network timeout occurs, the job simply fails and is safely re-enqueued by BullMQ.

### 2. Idempotent Job Execution & OCC
Because BullMQ ensures at-least-once delivery, workers must be idempotent and race-condition resilient:
- Every job payload includes a unique identifier (the Case ID + Intervention ID).
- Before a worker dispatches an SMS or makes a state change, it acquires a distributed lock via atomic DB `UPDATE ... WHERE lockedBy IS NULL`. If the intervention is already locked or marked `SUCCESS`, the worker safely drops the job.
- **Optimistic Concurrency Control (OCC):** All case state updates check the current `version` field. If a live Razorpay webhook (e.g. `payment.captured`) preempts a worker, the worker's OCC update will be rejected as stale, preventing any subsequent AI actions on a case that just resolved itself.

### 3. Worker Crash Recovery (Stale-Lock Scanner)
If a worker node crashes abruptly while holding an execution lock, the job would traditionally be permanently stalled. The system employs a scheduled `StaleLockScannerProcessor` that periodically sweeps the database for locks held beyond their maximum TTL (e.g., 5 minutes) and atomically releases them, fully restoring the cases back to the retry pool without human intervention.

### 3. Graceful Degradation
If the LLM or Causal ML models are completely offline and retries are exhausted, the worker catches the failure, transitions the `RecoveryPlan` to `FAILED`, and the domain model automatically falls back to a deterministic, hardcoded baseline policy to ensure revenue recovery attempts continue even during AI outages.
