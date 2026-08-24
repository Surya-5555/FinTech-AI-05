# Production Roadmap: AI Revenue Recovery System

> This document describes what would be built next if this system were deployed into production at Razorpay merchant scale. All features listed here are currently out of scope for the buildathon submission but represent the natural engineering evolution of the architecture.

---

## Phase 1: Live Razorpay Integration (Weeks 1–4)

### 1.1 Real Webhook Ingestion
- Replace the simulated `POST /api/events` with a Razorpay webhook subscription configured via the Razorpay Dashboard
- Implement HMAC-SHA256 webhook signature verification against `RAZORPAY_WEBHOOK_SECRET`
- Handle Razorpay's specific payload schema for `payment.failed`, `subscription.charged.failed`, and `nach.mandate_failed` events

### 1.2 Live Razorpay Test-Mode Execution
- Enable `RazorpayAdapter` to make real calls against Razorpay's test-mode sandbox
- Implement Razorpay payment link creation (`POST /v1/payment_links`) with pre-filled merchant and amount
- Implement eNACH mandate retry via Razorpay Subscriptions API
- Add response handling for Razorpay's full set of decline codes beyond the current simulation map

### 1.3 Live Customer Communication
- Configure Twilio account and sender number for production SMS
- Configure Resend domain for transactional email
- Implement DND (Do Not Disturb) registry check before SMS sending
- Add delivery status webhook callbacks to update intervention outcome

---

## Phase 2: Merchant Configuration Portal (Weeks 4–8)

### 2.1 Merchant Self-Service Policy Configuration
- Build a merchant-facing UI for configuring `maxAttemptsPerCase`, `cooldownPeriodMs`, and `allowedChannels`
- Add per-merchant exception lists (specific customer IDs to never retry automatically)
- Implement merchant-level LLM message tone configuration (formal / conversational / Hinglish)

### 2.2 Multi-Merchant Isolation
- Implement strict row-level security on all PostgreSQL tables using merchant-scoped API keys
- Add per-merchant rate limits on ingestion endpoints
- Tenant-aware metrics aggregation in the dashboard

---

## Phase 3: Customer Consent Database (Weeks 8–12)

### 3.1 Consent Management
- Build a consent store tracking `smsConsent`, `emailConsent`, `voiceConsent` per customer × merchant pair
- Integrate with Razorpay's customer records via `GET /v1/customers/{id}`
- Add consent update webhooks (customer opts out → immediate propagation to policy engine)
- DPDP Act 2023 compliance: consent withdrawal must halt all in-flight interventions

### 3.2 Preference Learning
- Track which communication channel each customer responds to
- Feed channel preference signals back into the ML pipeline as features
- Personalise intervention channel selection beyond CATE scores alone

---

## Phase 4: A/B Experimentation Framework (Weeks 12–20)

### 4.1 Online Experiment Harness
- Implement treatment arm assignment with hash-based deterministic splitting
- Track experiment assignments in the audit log alongside intervention outcomes
- Report per-arm recovery rates, precision, and cost in the evaluation dashboard

### 4.2 Causal Model Retraining Pipeline
- Accumulate real intervention outcomes (treatment + outcome) into a training buffer
- Periodic offline retraining of the T-Learner on merchant-specific data
- A/B test new model versions before promoting to production (shadow scoring)

### 4.3 Online Bandit (Long-Term)
- Migrate from offline T-Learner to a contextual bandit that updates in near-real-time
- Implement Thompson Sampling for exploration/exploitation balance in intervention selection

---

## Phase 5: Observability & Operations (Ongoing)

### 5.1 Production Monitoring
- Prometheus metrics endpoint (`/metrics`) with Grafana dashboard
- Alerts on: recovery rate drop > 5% from 7-day baseline, AI fallback rate > 50%, worker lag > 100 jobs
- Pino structured logs shipped to a log aggregator (Loki, Datadog, etc.)

### 5.2 Audit Compliance
- 90-day immutable audit trail with cryptographic hash chain
- Export capability for regulatory review (JSON + PDF)
- PCI-DSS scope review for any system touching card decline codes

### 5.3 Incident Response Runbooks
- Runbook: ML service down → fallback mode verification → reactivation
- Runbook: LLM provider outage → template mode → rollback
- Runbook: Razorpay API degradation → circuit breaker → manual escalation queue

---

## Out of Scope (Buildathon Constraints)

The following were explicitly out of scope for this submission:
- **Real customer PII**: All evaluation data uses a purpose-built benchmark dataset — no real customer records
- **Live money movement**: All Razorpay calls use test-mode simulation
- **Production deployment**: The system is designed to run locally with Docker; a production k8s deployment configuration is in `infra/k8s/` as a starting point
- **SMS/Email to real customers**: No real outreach is triggered in any demo or evaluation run
