# Observability Foundation

## Overview
Given the asynchronous and distributed nature of the AI Revenue Recovery system (API ingress -> Database -> Outbox -> BullMQ Workers -> LLM APIs -> Razorpay APIs), comprehensive observability is a non-negotiable requirement. Our observability foundation ensures that every request, background job, and state transition is strictly traceable, measurable, and auditable.

## 1. Structured JSON Logging (Pino)
All logging across the API, Worker, and Evaluation layers is handled by `pino`, outputting strict newline-delimited JSON (NDJSON). 
- **Why JSON?** It allows for seamless ingestion into modern log aggregators (ELK, Datadog, CloudWatch) without fragile regex parsing.
- **Contextual Logging:** We leverage Node.js `AsyncLocalStorage` (via `nestjs-pino`) to automatically attach a `correlationId` to every single log statement generated within the lifecycle of an HTTP request or a BullMQ job, eliminating the need to pass a logger instance through every function signature.
- **Data Scrubbing:** The logger is configured to aggressively sanitize sensitive fields (e.g., API keys, personally identifiable information, raw payload dumps) before they are serialized.

## 2. Distributed Tracing & Correlation
- **Ingress:** When a webhook or API request arrives, the `CorrelationIdMiddleware` generates a UUID v4 (if `x-correlation-id` is not provided) and attaches it to the request context.
- **Queue Propagation:** When the Outbox pattern enqueues a job into BullMQ, the `correlationId` is injected into the job payload metadata.
- **Worker Execution:** The Worker extracts the `correlationId` and re-initializes the `AsyncLocalStorage` context, ensuring that logs generated during async background processing are perfectly linked back to the original webhook that triggered them.

## 3. Metrics and Telemetry (Prometheus)
Key performance and business metrics are exposed via a standard `/metrics` endpoint using `prom-client`.
- **System Metrics:** Event loop lag, memory usage, open handles.
- **Business Metrics:** Counter for `events_ingested_total`, `interventions_executed_total`, and gauge for `active_revenue_cases`.
- **AI Telemetry:** LLM token usage, execution latency, and fallback-trigger rates are tracked to monitor the cost and reliability of the causal ML/LLM pipelines.
