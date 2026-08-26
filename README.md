# Razorpay AI Revenue Recovery Architecture

An evaluation-first, causal-AI revenue recovery system designed with enterprise-grade deterministic financial safety.

###  A Special Thanks to Razorpay :)
> *This Buildathon has been an incredible journey that pushed my engineering limits. Building under intense pressure forced me to think deeply about architectural trade-offs, fault tolerance, and the non-negotiable nature of distributed state. It taught me the true value of selecting the right stack for the problem, designing with failure as a first principle, and treating infrastructure as a core component of the business logic. It instilled a rigorous discipline for uncompromising code quality, deterministic financial safety, and resilient system design. Thank you for the challenge and the opportunity to elevate my craft. I'm looking forward to connecting with the Razorpay team!*

## 1. System Overview

**What is this system?** 
This is a comprehensive, asynchronous revenue recovery architecture for processing failed payment events (e.g., card expiry, bank timeouts, insufficient funds). It ingest webhooks, utilizes AI to diagnose and plan interventions, strictly enforces financial safety rules via a deterministic policy engine, and executes recovery actions through resilient queue workers.

**What problem does it solve?** 
Merchants lose significant revenue when recurring payments fail. Blindly retrying cards wastes API calls, triggers fraud alerts, and annoys customers. Doing nothing loses the customer. 

**Why does it exist?** 
To maximize recovered revenue by personalizing the recovery intervention (e.g., silent API retry vs. SMS payment link) based on the specific context of the failure, while ensuring that AI hallucinations or ML errors cannot bypass deterministic policy gates to trigger unsafe financial operations.

## 1.1 Core Design Philosophy (How I Think)

Building financial infrastructure requires a fundamentally different mindset than building standard AI applications. My architecture is driven by the following core principles:

1. **Bounded AI over Unbounded Autonomy**: AI is exceptionally good at reasoning (diagnosing failure context, writing personalized messages, calculating causal uplift), but it cannot be trusted with unstructured money movement. I use AI exclusively for *intent generation*, while a rule-based, deterministic **Policy Engine** serves as the final authority on execution.
2. **Deterministic Financial Safety**: Every AI-proposed action passes through strict idempotency checks, merchant consent validation, attempt limits, and chronological bounds. If an AI hallucinates an unauthorized intervention, the policy engine safely intercepts and rejects it, maintaining a complete immutable audit trail.
3. **Resilience & Graceful Degradation**: Built on an event-driven queue architecture, the system is highly fault-tolerant against external API timeouts, duplicate webhooks, and sudden traffic spikes. If the AI service experiences downtime, the system degrades gracefully without blocking core ingestion.
4. **Data-Driven Measurement**: Revenue recovery is an optimization problem. This architecture is designed to capture every state transition and outcome, enabling causal ML models (T-Learners) to continually refine intervention strategies based on actual recovered monetary value.

## 1.2 Technology Stack Justification

Every tool in this architecture was selected specifically to enforce strict financial safety and operational resilience:

- **TypeScript & NestJS (vs. Express or purely Python):** Financial routing requires strict domain modeling. NestJS provides enterprise-grade dependency injection, enforcing clean boundaries between external webhooks, domain policies, and infrastructure. Python is strictly isolated to the mathematical ML layer (FastAPI) where it excels.
- **PostgreSQL & Prisma (vs. MongoDB/NoSQL):** Handling concurrent webhook retries requires ACID compliance and Optimistic Concurrency Control (OCC). NoSQL databases increase the risk of race conditions under high webhook concurrency. PostgreSQL enforces atomic transactions and unique constraint checks.
- **BullMQ & Redis (vs. Kafka or RabbitMQ):** Revenue recovery requires precise delayed scheduling (e.g., "retry in 3 hours") and atomic state transitions. BullMQ provides these precise retry semantics natively, whereas Kafka is designed for high-throughput streaming and introduces unnecessary operational overhead for transactional outboxes.
- **XGBoost (vs. Deep Learning):** For Causal Inference on tabular payment data, XGBoost (via T-Learners) is selected for this workload. It is highly interpretable, fast, and typically requires less tuning to achieve high performance on structured tabular datasets compared to deep neural networks. It provides explainable Net Expected Incremental Value (Net EIV) scores.
---

## 2. Global Architecture Diagram

```mermaid
flowchart TB
    %% Definitions
    classDef external fill:#1e293b,stroke:#0f172a,stroke-width:2px,color:#fff
    classDef api fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,color:#000
    classDef domain fill:#f0fdf4,stroke:#86efac,stroke-width:2px,color:#000
    classDef ai fill:#eff6ff,stroke:#93c5fd,stroke-width:2px,color:#000
    classDef data fill:#fefce8,stroke:#fde047,stroke-width:2px,color:#000

    %% Subgraphs
    subgraph EXTERNAL ["External Boundaries"]
        Webhook["Razorpay Webhook"]
        Provider["Razorpay Test-Mode Sandbox"]
    end
    class Webhook,Provider external

    subgraph API_LAYER ["Application / API Layer"]
        Ingestion["Webhook Ingestion Controller"]
        DashboardUI["React Operations Dashboard"]
    end
    class Ingestion,DashboardUI api

    subgraph DOMAIN_LAYER ["Domain & Orchestration"]
        Orchestrator["Recovery Orchestrator"]
        Idempotency["Idempotency Guards"]
        Planning["Recovery Planning Service"]
        Policy["Deterministic Policy Engine"]
        StateMachine["Lifecycle State Machine"]
    end
    class Orchestrator,Idempotency,Planning,Policy,StateMachine domain

    subgraph AI_SERVICES ["AI & ML Services"]
        ML_FastAPI["XGBoost Causal T-Learner (FastAPI)"]
        LLM_Client["LangGraph Agentic Workflow (LLM)"]
        Eval["Offline ML Evaluation Pipeline"]
    end
    class ML_FastAPI,LLM_Client,Eval ai

    subgraph EXECUTION_LAYER ["Worker Execution Layer"]
        BullMQ[("BullMQ (Redis Outbox)")]
        IngestionProcessor["Ingestion Processor"]
        Worker["Execution Worker"]
        Adapter["Razorpay Execution Adapter"]
    end
    class BullMQ,IngestionProcessor,Worker,Adapter api

    subgraph PERSISTENCE ["Persistence & Audit"]
        Postgres[("PostgreSQL (Prisma)")]
        AuditLog["Immutable Audit Trail"]
    end
    class Postgres,AuditLog data

    %% Connections
    Webhook --> Ingestion
    Ingestion --> BullMQ
    BullMQ --> IngestionProcessor
    IngestionProcessor --> Idempotency
    Idempotency --> Orchestrator
    
    Orchestrator <--> StateMachine
    Orchestrator --> Planning

    Planning <--> ML_FastAPI
    Planning <--> LLM_Client
    
    Planning --> Policy
    Policy --> Orchestrator
    
    Orchestrator --> BullMQ
    BullMQ --> Worker
    Worker --> Adapter
    Adapter --> Provider
    
    Orchestrator --> Postgres
    Worker --> Postgres
    IngestionProcessor --> Postgres
    Policy --> AuditLog
    Worker --> AuditLog
    
    Eval --> ML_FastAPI
    DashboardUI <--> Ingestion
    Postgres -.-> DashboardUI
```

*(or in text format below)*

### Global Architecture (Text View)
- **External Boundaries:** Razorpay Webhook -> Razorpay Test-Mode Sandbox
- **API Layer:** Webhook Ingestion Controller, React Operations Dashboard
- **Domain Layer:** Recovery Orchestrator, Idempotency Guards, Recovery Planning Service, Deterministic Policy Engine, Lifecycle State Machine
- **AI & ML Services:** XGBoost Causal T-Learner (FastAPI), LangGraph Agentic Workflow (LLM), Offline ML Evaluation Pipeline
- **Worker Execution Layer:** BullMQ (Redis Outbox), Ingestion Processor, Execution Worker, Razorpay Execution Adapter
- **Persistence & Audit:** PostgreSQL (Prisma), Immutable Audit Trail

---

## 2.1 Database System Design (HLD & ERD)

To enforce transaction safety, we use PostgreSQL as our single source of truth. The schema enforces **Optimistic Concurrency Control (OCC)** via the `version` field and strict idempotency via unique constraints, preventing dirty writes under high load.

```mermaid
erDiagram
    MERCHANT ||--o{ CUSTOMER : "has"
    MERCHANT ||--o{ REVENUE_CASE : "owns"
    MERCHANT ||--o{ REVENUE_EVENT : "receives"
    CUSTOMER ||--o{ REVENUE_CASE : "experiences"
    CUSTOMER ||--o{ REVENUE_EVENT : "triggers"
    REVENUE_EVENT ||--o| REVENUE_CASE : "creates/resolves"
    REVENUE_CASE ||--o{ AUDIT_LOG : "generates"
    
    MERCHANT {
        string id PK
        string externalReference UK
        string name
        jsonb configJson
    }
    
    CUSTOMER {
        string id PK
        string merchantId FK
        string externalReference
        string emailEncrypted
        string phoneEncrypted
    }
    
    REVENUE_EVENT {
        string id PK
        string externalEventId
        string idempotencyKey UK
        string eventType
        int amountMinor
        string currency
    }
    
    REVENUE_CASE {
        string id PK
        string sourceEventId FK
        string state "e.g. DETECTED, PLANNED, EXECUTING"
        int amountAtRiskMinor
        int version "Optimistic Concurrency Control"
    }
    
    AUDIT_LOG {
        string id PK
        string entityType
        string entityId FK
        string action
        jsonb metadataJson
        datetime timestamp
    }
```

*(or in text format below)*

### Database System Design (Text View)
- **MERCHANT:** 1-to-many with CUSTOMER, REVENUE_CASE, and REVENUE_EVENT.
- **CUSTOMER:** 1-to-many with REVENUE_CASE and REVENUE_EVENT.
- **REVENUE_EVENT:** 1-to-1 with REVENUE_CASE. Contains unique `idempotencyKey` to prevent duplicate ingestion.
- **REVENUE_CASE:** 1-to-many with AUDIT_LOG. Uses `version` for Optimistic Concurrency Control. Distributed execution locks are enforced at the Intervention level.
- **AUDIT_LOG:** Immutable append-only ledger tracking all AI and system decisions.

---

## 3. End-to-End Execution Flow

1. **Webhook Arrival:** A payment failure event enters the system.
2. **Idempotency Guard:** The system checks database unique constraints to drop duplicates.
3. **State Machine:** The case transitions to `DETECTED`.
4. **AI Planning:** The LLM diagnoses the failure reason and drafts SMS copy. The ML pipeline provides Causal Propensity Scores (Net Expected Incremental Value).
5. **Deterministic Policy:** The policy engine intercepts the AI plan. It enforces consent, cooldowns, and maximum retry attempts. 
6. **Approval/Rejection:** If approved, the case transitions to `PLANNED`. If rejected, it moves to `STOPPED` or `ESCALATED`.
7. **Queuing:** The approved intervention is dispatched to BullMQ.
8. **Execution:** The worker pulls the job, delegates to the Razorpay adapter, and executes the bounded action (e.g., sending a payment link).
9. **Outcome:** The result is persisted, logging to the immutable audit trail, transitioning the state to `RECOVERED` or `FAILED`.

---

## 3.1 Handling High Concurrency (Race Conditions)

To ensure that a customer is not spammed and a merchant is not double-charged, we engineered a strict combination of **Database Idempotency** and **Distributed Worker Locks**. The diagram below demonstrates how the system safely processes concurrent duplicate webhook delivery without duplicating efforts.

```mermaid
sequenceDiagram
    participant Razorpay as Razorpay Webhook
    participant API as Ingestion API
    participant DB as PostgreSQL (Prisma)
    participant Worker as Background Worker

    Note over Razorpay, API: Simultaneous identical webhooks<br/>arrive at the exact same millisecond
    
    par Request 1
        Razorpay->>+API: POST /events/ingest (Event A)
    and Request 2
        Razorpay->>+API: POST /events/ingest (Event A duplicate)
    and Request 3
        Razorpay->>+API: POST /events/ingest (Event A duplicate)
    end

    Note over API, DB: All 3 requests attempt to acquire<br/>a unique constraint on 'idempotencyKey'

    API->>DB: INSERT INTO RevenueEvent (idempotencyKey=A)
    DB-->>API: Success (Row Created)
    
    API->>DB: INSERT INTO RevenueEvent (idempotencyKey=A)
    DB-->>API: ❌ Unique Constraint Violation (HTTP 409)
    
    API->>DB: INSERT INTO RevenueEvent (idempotencyKey=A)
    DB-->>API: ❌ Unique Constraint Violation (HTTP 409)

    API-->>-Razorpay: 200 OK (Processed successfully)
    API-->>-Razorpay: 409 Conflict (Dropped duplicate)
    API-->>-Razorpay: 409 Conflict (Dropped duplicate)

    Note over API, Worker: Only ONE valid event makes it to the queue
    API-)Worker: Queue Job (Event A)
    
    Note over Worker, DB: Worker acquires Distributed Lock for execution
    Worker->>DB: UPDATE RevenueCase SET lockedBy = 'Worker-1' WHERE lockedBy IS NULL
    DB-->>Worker: Success (1 row updated)
    
    Note over Worker, DB: If another worker tries to<br/>lock it simultaneously...
    Worker->>DB: UPDATE RevenueCase SET lockedBy = 'Worker-2' WHERE lockedBy IS NULL
    DB-->>Worker: ❌ Failed (0 rows updated) - Silently aborts duplicate execution
```

*(or in text format below)*

### Handling High Concurrency (Text View)
1. **Simultaneous Arrival:** Multiple identical webhooks hit the API at the exact same millisecond.
2. **Database Idempotency Check:** All requests attempt to insert into `RevenueEvent` with the same `idempotencyKey`.
3. **Optimistic Rejection:** Exactly ONE insert succeeds. The database rejects the others with a Unique Constraint Violation.
4. **Graceful Drop:** The API returns `409 Conflict` for the duplicates, silently dropping them without processing.
5. **Worker Execution Lock:** The background worker attempts to lock the case via `UPDATE ... WHERE lockedBy IS NULL`. If another worker tries simultaneously, the database rejects it (0 rows updated), strictly preventing concurrent duplicate execution.

---

## 4. Feature Inventory

### Core Platform
- **Webhook Ingestion:** NestJS controllers securely authenticate JSON payloads from Razorpay using HMAC-SHA256 signatures against the raw byte stream. To strictly respect the 5-second gateway timeout and prevent webhook disablement, the controller immediately pushes the validated payload to a BullMQ queue and returns a fast `200 OK`.
- **Event Processing & Case Creation:** Background workers asynchronously parse the JSON payload, mapping it to typed `RecoveryCase` entities with strict BigInt arithmetic for all monetary values (no floating point).
- **State Machine:** Enforces strict lifecycle transitions: `DETECTED` → `PLANNED` → `POLICY_CHECKED` → `QUEUED` → `EXECUTING` → `RECOVERED` / `RETRYABLE` / `FAILED` / `STOPPED` / `ESCALATED`. Invalid transitions are rejected with a typed error.
- **Case Orchestrator:** A background cron service (`CaseOrchestratorService`) sweeps the database for new `DETECTED` cases. It autonomously batches them, executes the LangGraph AI Dunning Workflow to generate recovery plans, and securely pushes them into the Redis Outbox—automating routine recovery planning while escalating complex cases for human review.
- **Terminal States:** `RECOVERED`, `FAILED`, `STOPPED`, `REJECTED`, and `EXPIRED` are terminal (enforced via `isTerminal()`) — any subsequent attempt to execute an intervention on a terminal case is rejected before touching the DB. (Note: `ESCALATED` pauses automated retries and requires operator intervention.)

#### Lifecycle State Machine (Fintech Strict Transitions)

```mermaid
stateDiagram-v2
    [*] --> DETECTED : Webhook Ingested
    
    DETECTED --> PLANNED : AI Plans & Policy Approves
    DETECTED --> STOPPED : Policy Blocks (e.g., Fraud, Cooldown)
    DETECTED --> ESCALATED : Policy Requires Human Approval
    
    PLANNED --> EXECUTING : Worker Acquires Lock
    
    EXECUTING --> RECOVERED : Payment Captured
    EXECUTING --> RETRYABLE : Transient Failure (< max attempts)
    EXECUTING --> FAILED : Payment Hard Failed
    EXECUTING --> ESCALATED : Max Retries Exceeded
    RETRYABLE --> QUALIFIED : Cooldown Passed
    QUALIFIED --> PLANNED : AI Re-Plans
    
    RECOVERED --> [*]
    STOPPED --> [*]
    ESCALATED --> [*]
```

*(or in text format below)*

### Lifecycle State Machine (Text View)
- **DETECTED:** Initial state when Webhook is ingested.
  - Transitions to **PLANNED** if AI plans & Policy Engine approves.
  - Transitions to **STOPPED** if Policy Engine blocks it (e.g. Fraud, Cooldown).
- **PLANNED:** Waiting for execution.
  - Transitions to **EXECUTING** when Worker acquires the lock.
- **EXECUTING:** Provider API is called.
  - Transitions to **RECOVERED** if payment is captured successfully.
  - Transitions to **FAILED** if payment hard fails.
  - Transitions to **RETRYABLE** if there is a transient failure and attempts < maxAttempts.
  - Transitions to **ESCALATED** if the max retry limit is exceeded.
- **RETRYABLE:** Resets back to **PLANNED** for a new AI retry strategy.
- **Terminal States:** RECOVERED, FAILED, STOPPED, REJECTED, EXPIRED.

---

### Financial Safety Controls
- **Strict Header-Based Idempotency:** A dedicated PostgreSQL `EventIdempotency` table explicitly checks the `x-razorpay-event-id` header upon ingestion. Because Razorpay operates on at-least-once delivery, this ensures duplicate webhook payloads are silently dropped before they ever reach the background worker.
- **Immutable AI Audit Trails:** When the LangGraph AI orchestrator produces a recovery plan, its complete multi-node reasoning dictionary (the state object) is serialized into the `reasoningTrace` column of the `AuditLog`. This ensures every probabilistic AI decision is auditable and traceable.
- **Optimistic Concurrency Control (OCC):** Every case update checks the current `version` field. A stale update (version mismatch) is rejected with a conflict error — the caller must re-fetch before retrying.
- **In-Flight Payment Race Conditions:** A dedicated webhook controller (`razorpay.controller.ts`) catches live `payment.captured` and `order.paid` events. It uses OCC to preemptively halt any scheduled AI interventions if the customer pays on their own before the worker runs.
- **Distributed Execution Lock:** Before any provider call, the worker does an atomic `UPDATE ... WHERE lockedBy IS NULL`. If another worker already holds the lock, 0 rows are updated → silent drop. Prevents concurrent duplicate execution.
- **Stale-Lock Scanner (Crash Recovery):** A cron-driven `StaleLockScannerProcessor` automatically detects and clears locks held by workers that crashed mid-execution, restoring cases to a retryable state without human intervention.
- **Partial Payment Settlements:** When `INITIATE_PAYMENT_RETRY` results in a partial capture, the system deterministically updates `amountAtRiskMinor` and reverts the case state to `DETECTED`. This securely kicks the case back to the AI orchestrator to dynamically plan a new intervention for the *remaining* balance instead of falsely marking it recovered.
- **Currency Mismatch & Cross-Border Guard:** `evaluateRecoveryPolicy` strictly blocks interventions if the event currency isn't configured in the merchant's supported ledger (`MerchantRecoveryPolicyConfig`), and automatically stops international payment recovery attempts if `allowCrossBorderRecovery` is disabled.
- **Maximum-Attempt Enforcement:** `merchantPolicy.maxAttemptsPerCase` (default: 3) is checked synchronously. Exceeding it forces `ESCALATED` state before any API call.
- **Consent Enforcement:** SMS requires `smsConsent=true`; email requires `emailConsent=true`. Missing consent → `CONSENT_MISSING` reason code → intervention blocked.
- **Mandatory Fraud Hard-Block:** If `failureCode` maps to a known fraud indicator (e.g. `SUSPECTED_FRAUD`), the root cause is deterministically flagged as `FRAUD` (0% recovery confidence), and all interventions are hard-blocked (`stopCase: true`) regardless of AI recommendation.
- **Calling Window & Frequency Compliance:** Strictly enforces the configured 09:00 AM – 08:00 PM IST contact window and daily maximum messaging limits (via `contactWindowMetadataJson`), and independently enforces customer consent and preference compliance. Interventions outside this window are gracefully deferred with a `RETRY_AFTER` directive.
- **Secure Webhook Verification:** Cryptographically validates `x-razorpay-signature` using HMAC-SHA256 against raw buffers (via NestJS `rawBody`) and `crypto.timingSafeEqual()` to prevent timing side-channel attacks.
- **Cooldown Gate:** `lastAttemptAt + cooldownPeriodMs > now()` blocks rapid re-attempts on the same case.
- **Failure Isolation:** AI failures, ML timeouts, and provider errors are caught within their bounded context. They do not propagate to the ingestion layer — the system degrades gracefully.

---

## 4. Dual-Engine AI Architecture (Causal ML + Agentic Workflow)

### 4.1 Causal Machine Learning (T-Learner)

**Architecture:** Multi-Treatment T-Learner (XGBoost metalearner)

The key question is not *"will this customer pay?"* but *"will this customer pay because of our specific intervention?"* — a causal inference problem. The T-Learner trains a separate model per treatment arm:

| Model | Treatment | Predicts |
|---|---|---|
| `μ̂_0(x)` | Control (no action) | P(recovery \| no intervention) |
| `μ̂_1(x)` | T1 — Retry Payment | P(recovery \| retry) |
| `μ̂_2(x)` | T2 — Payment Link | P(recovery \| payment link) |

CATE per treatment: `τ̂_t(x) = μ̂_t(x) − μ̂_0(x)`

Net Expected Incremental Value: `NEIV_t = τ̂_t(x) × amountMinor − cost_t`

The system selects `argmax_t(NEIV_t)`. If all NEIV scores are negative, doing nothing is optimal — the system stops the case.

- **Dual-Track ML Strategy for Scientific Integrity:** In a Buildathon environment, real Razorpay merchant data is strictly protected due to PII compliance and privacy restrictions. To maintain scientific integrity, we do not rename public retail datasets (like Hillstrom) to resemble proprietary payment data. Therefore, we implemented a dual-track strategy:
  1. *Track 1 (Methodology Proof on Human RCT Data):* We downloaded the public Hillstrom Email Marketing dataset (64,000 real human customers) and ran causal uplift modeling using our exact T-Learner algorithm (`statistical_audit.py`). This demonstrates to the jury that our causal methodology works on real human behavior with statistically significant uplift.
  2. *Track 2 (Operational Payment Demo):* We trained the production service (`train.py`) on a synthetic Razorpay failure dataset with realistic payment features (mandate type, error codes, network tokenization). This powers the live API and dashboard without risking PII.
- **Explainability:** For every case, the model logs the predicted CATE (Conditional Average Treatment Effect) across all 3 treatment arms, along with feature attributions (SHAP values). The operator can see *why* the model chose SMS over Email for a specific failure.
- **Inference API:** Python FastAPI service on port 8000, called from the NestJS domain layer with a 3-second timeout.
- **Evaluation:** `python apps/ml-pipeline/src/statistical_audit.py` generates AUROC, PR-AUC, Brier score, and Bootstrap 95% CIs per treatment arm to validate the methodology on the offline benchmark.

---

### 4.2 Generative AI (LLM Agentic Workflow)

**Failure Diagnosis:** The LLM reads the Razorpay decline code and case context, and produces a structured root-cause diagnosis (e.g., `"bank_timeout" → "Bank's payment gateway experienced a transient timeout — a retry is likely to succeed"`).

**Downtime-Aware Routing:** The AI context dynamically evaluates the `rootCause` against known downtime states (e.g., `upi_downtime`, `bank_downtime`). If an active network downtime is detected, the recovery messaging explicitly pivots, advising the user to avoid the degraded network and use an alternative payment method (like a Card) to maximize conversion probability. This context-enrichment pattern directly implements the official [Razorpay Downtime API guidelines](https://razorpay.com/docs/api/payments/downtime/), which instruct merchants to *"communicate it to your customers and display only the unaffected payment methods"*.

**Customer Communication:** Context-aware messages drafted for SMS, Email, and Voice channels across 4 Indian locales:

| Locale | Language | Reaches |
|---|---|---|
| `EN_IN` | English (Indian) | Default — all India |
| `HI_IN` / `HINGLISH` | Hinglish (Hindi-English) | North India, Hindi belt — largest urban customer base |
| `TA_IN` | Tamil | Tamil Nadu — major Razorpay merchant state |
| `KN_IN` | Kannada | Karnataka — **Razorpay HQ** and Bangalore merchant hub |

**Example Messages:**

*Hinglish SMS:* `"Namaste! Zomato Pro ke liye aapka ₹1,200 ka payment pending hai. Abhi pay karein."`

*Tamil SMS:* `"வணக்கம்! Zomato Pro-க்கான உங்கள் ₹1,200 தொகை நிலுவையில் உள்ளது. இப்போதே செலுத்துங்கள்."`

*Kannada SMS:* `"ನಮಸ್ಕಾರ! Zomato Pro ಗಾಗಿ ನಿಮ್ಮ ₹1,200 ಪಾವತಿ ಬಾಕಿ ಇದೆ. ಈಗಲೇ ಪಾವತಿ ಮಾಡಿ."`

**Safety Prompting:** Every LLM call includes `SharedSafetyPolicyV1` — a system instruction block that forbids recovery guarantees, pressure language, and financial claims. The model must self-report any violation in its structured output.

**Structured Output:** All LLM responses are validated through a Zod schema. A response that fails validation (malformed JSON, missing fields, safety violation) immediately triggers the deterministic fallback — the LLM cannot produce an unvalidated string that reaches a customer.

**Fallback Templates:** Locale-aware deterministic templates for all 4 locales × 4 contexts (Downtime, SMS, Voice, Email) = **16 fallback templates total**. The system runs fully without any LLM API key in benchmark mode.

#### AI & Policy Decision Flow (Bounded Autonomy)

This diagram illustrates that the AI is fully "bounded". It is designed not to independently trigger a financial action without passing through the deterministic policy engine.

```mermaid
flowchart TD
    Start([Case DETECTED]) --> LLM[LLM: Root Cause Diagnosis]
    Start --> ML[ML: Causal T-Learner Propensity]
    
    LLM --> Plan[AI Recovery Plan Formulated]
    ML --> Plan
    
    Plan --> Policy{Deterministic Policy Gate}
    
    Policy -- Fraud / No Consent / Stale --> Block[Reject & State = STOPPED]
    Policy -- Valid & Safe --> Approve[Approve & State = POLICY_CHECKED]
    
    Approve --> Queue[Dispatch to BullMQ & State = QUEUED]
```

*(or in text format below)*

### AI & Policy Decision Flow (Text View)
1. **Inputs:** A case enters as `DETECTED`. The **LLM** diagnoses the root cause, while the **ML Model (T-Learner)** calculates causal propensity scores.
2. **Plan Formulation:** Both AI signals combine into an AI Recovery Plan.
3. **Deterministic Policy Gate:** The plan MUST pass through strict, rule-based policies.
4. **Rejection:** If the policy detects Fraud, Missing Consent, or Stale State, the plan is blocked and the case is **STOPPED**.
5. **Approval:** If the policy validates it as safe, the plan is approved, state becomes **POLICY_CHECKED**, and when dispatched to BullMQ for execution, state transitions to **QUEUED**.

---

### Execution Engine
- **Asynchronous Workers:** BullMQ (Redis-backed) manages job dispatch. Workers retry transient errors up to a configured maximum; exhausted retries land in the dead-letter queue.
- **Provider Abstraction:** The `ExecutionProvider` interface decouples orchestration from provider implementation. Swapping Razorpay test-mode → live → alternative provider requires no orchestration changes.
- **Provider Support:** `RazorpayAdapter` (payment retry + payment link), `TwilioAdapter` (SMS), `ResendAdapter` (email), `EscalationAdapter` (human review flag).
- **Razorpay Test-Mode Guard:** A runtime check enforces `ENABLE_RAZORPAY_TEST_MODE=true`. If absent, the adapter throws `ConfigurationError` before any API call — no accidental live API calls.
- **Outcome Logging:** Every provider response (success, failure, timeout) is persisted in the case audit trail within the same Prisma transaction as the lock release.

---

### Dashboard UI (React)
- **Data Mode Transparency:** Explicit `RAZORPAY_TEST` and `Offline Benchmark Model` labels throughout — allowing operators to clearly observe what data mode the system is operating in.
- **Financial Funnels:** Total At Risk → System Recovered → False Intervention Rate → Active Escalations — the key business metrics on the home screen.
- **Case Pipeline:** Table with filter by state (`DETECTED`, `PLANNED`, `EXECUTING`, `RECOVERED`, `FAILED`, `STOPPED`, `ESCALATED`). Sortable by amount, date, merchant.
- **Case Detail Audit View:** Clicking any case reveals the full lifecycle trace: original webhook payload → ML propensity scores (CATE per arm) → LLM diagnosis text → policy gate decision with reason codes → worker execution result → final state transition.
- **Evaluation Tab:** Live metrics from the last `pnpm evaluate-smoke` run — recovery rate vs baselines, intervention precision, safety metrics chart.


---

## 5. Latest Evaluation Results

> **Dataset:** Purpose-built deterministic benchmark (seed=42, 500 cases). **Why Benchmark?** To ensure strict isolation of PII leakage, maintain strict regulatory compliance, and ensure mathematical reproducibility of the evaluation metrics, no real merchant data is used. **Future Path:** The identical evaluation pipeline will seamlessly ingest real Razorpay dataset exports once production access is granted, intended to minimize architectural changes.
> **Dataset checksum:** `d659a33b911118706d5cc4e6c206a92ef12557d5dfe8f06e1d5aa056155decd8`
> **Mode:** `BENCHMARK` — all provider calls use deterministic sandbox adapters. No live API calls.
> **Reproducible:** `pnpm evaluate-smoke` produces identical numbers on every run.

<!-- EVALUATION_RESULTS_START -->
## Run Configuration
- **Dataset Version**: 1.0.0
- **Dataset Checksum**: d659a33b911118706d5cc4e6c206a92ef12557d5dfe8f06e1d5aa056155decd8
- **Held-Out Case Count**: 500

## Money Metrics
- **Total At Risk**: 44357358
- **Naturally Recovered**: 0
- **Baseline 1 Recovered**: 22116004
- **System Recovered**: 9185069
- **Incremental vs Baseline 0**: 9185069
- **Incremental vs Baseline 1**: -12930935
- **Recovery Rate**: 20.71%

## Net ROI (Value minus Costs & Penalties)
- **Baseline 1 Gross Recovered**: 22116004
- **Baseline 1 Total Cost**: 459600 (including 3 fraud chargebacks)
- **Baseline 1 Net ROI**: 21656404
- **System Gross Recovered**: 9185069
- **System Total Cost**: 6600 (including 0 fraud chargebacks)
- **System Net ROI**: 9178469
- **Incremental Risk-Adjusted Value (System vs B1)**: -12477935


## Intervention Metrics
- **Attempted**: 132
- **Succeeded**: 35
- **Precision**: 26.52%
- **Failed**: 97 (73.48%)
- **False Interventions**: 0 (0.00%)
- **Avg Attempts Per Case**: 0.78

## Safety & Compliance
- **Policy Blocks**: 38
- **Escalations**: 97 (57.06%)
- **Stopped Cases**: 38 (22.35%)
- **Unsafe Prevented**: 0
- **Stale Prevented**: 0
- **Consent Blocks**: 0
- **Idempotent Replays**: 0

## Reliability & Errors
- **Evaluation Runtime**: 1914ms
- **Provider Timeouts**: 22
- **Provider Final Failures**: 75
- **Workflow Failures**: 0
- **AI Requests**: 113
- **AI Fallbacks**: 0
<!-- EVALUATION_RESULTS_END -->
### AI System Safety Constraints

Baseline 1 (Naive Retry) recovers more gross value by **blindly retrying every case** — including:
- **Fraud cases** (`SCN_FRAUD_SUSPECTED`) that are blocked from retry by policy — doing so risks chargeback liability, fraud re-classification, and Razorpay account suspension
- **Insufficient-funds cases** — statistically unlikely to succeed on immediate retry; burns API quota and triggers customer friction

The AI-assisted system **correctly refuses** unsafe cases. The result:
- ✅ **No false interventions were observed in the benchmark** — no unsafe actions executed
- ✅ **57.06% escalation rate** — genuinely ambiguous cases surfaced to humans
- ✅ **0 workflow failures** — full resilience across all 500 evaluated cases

Full interpretation: [`docs/evaluation/EVALUATION.md`](docs/evaluation/EVALUATION.md)


## 6. Directory Structure & Services

The system is managed as a pnpm monorepo.

```text
├── apps/
│   ├── api/          # NestJS backend (Ingestion, Webhooks, API)
│   ├── evaluator/    # CLI batch evaluation runner
│   ├── frontend/     # React Operations Dashboard
│   ├── ml-pipeline/  # Python FastAPI XGBoost Microservice
│   └── worker/       # NestJS/BullMQ job executor
├── libs/
│   ├── contracts/    # Shared DTOs, interfaces, and enums
│   ├── domain/       # Core state machine, policy engine, planning
│   ├── evaluation/   # Financial metrics calculation engine
│   ├── llm/          # LLM client abstraction and fallbacks
│   └── persistence/  # Prisma schema, DB migrations, adapters
├── docs/             # Architecture, decisions, and documentation
├── infra/            # Docker compose and deployment configurations
└── tests/            # Integration and E2E testing suites
```

---

## 6. Getting Started (Local Development)

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 22 LTS+ | API, Worker, Frontend |
| pnpm | 10+ | Monorepo package manager |
| Docker Desktop | Latest | Postgres + Redis containers |
| Python | 3.10+ | ML inference service |
| Git | Any | Source control |

---

### Step 1 — Clone & Install

```bash
git clone https://github.com/Surya-5555/FinTech-AI-05.git
cd FinTech-AI-05

# Install all Node dependencies across the monorepo
pnpm install
```

---

### Step 2 — Environment Setup

```bash
# Copy the example env file
cp .env.example .env
```

Open `.env` and fill in the required values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `LLM_API_KEY` | Yes | Google Gemini API key |
| `LLM_MODEL` | Yes | e.g. `gemini-2.5-flash` |
| `RAZORPAY_KEY_ID` | Yes | Razorpay test-mode key |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay test-mode secret |
| `ENABLE_RAZORPAY_TEST_MODE` | Yes | Must be `true` for local dev |
| `TWILIO_ACCOUNT_SID` | Optional | SMS outreach |
| `TWILIO_AUTH_TOKEN` | Optional | SMS outreach |
| `TWILIO_FROM_NUMBER` | Optional | SMS outreach |
| `RESEND_API_KEY` | Optional | Email outreach |
| `RESEND_FROM_EMAIL` | Optional | Email outreach |
| `API_AUTH_TOKEN` | Yes | Internal API authentication |

---

### Step 3 — Python ML Environment

```bash
cd apps/ml-pipeline
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate

pip install -r requirements.txt
cd ../..
```

---

### Step 4 — Database Setup

```bash
# Start Postgres + Redis via Docker
docker compose -f infra/compose/compose.yaml up -d

# Push schema to database
pnpm --filter @rr/persistence exec prisma db push

# Generate Prisma client
pnpm --filter @rr/persistence run generate
```

---

### Step 5 — Run Everything (One Command)

#### Windows (PowerShell)
Opens 5 separate terminal windows — one per service:

```powershell
.\scripts\dev-start.ps1
```

<details>
<summary>View full script: <code>scripts/dev-start.ps1</code></summary>

```powershell
# dev-start.ps1 - Local Development Startup Script (Windows)
# Usage: .\scripts\dev-start.ps1 from the project root

$ROOT = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Razorpay AI Revenue Recovery - Dev    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Infra: Postgres + Redis
Write-Host "[1/5] Starting infrastructure (Postgres + Redis)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT'; docker compose -f infra/compose/compose.yaml up"

Write-Host "      Waiting 5s for Docker to spin up..."
Start-Sleep -Seconds 5

# 2. ML Pipeline on port 8000
Write-Host "[2/5] Starting ML Pipeline (port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT\apps\ml-pipeline\src'; ..\venv\Scripts\Activate.ps1; python server.py"

# 3. API Server on port 3000
Write-Host "[3/5] Starting API Server (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT'; pnpm --filter @rr/api dev"

# 4. Background Worker
Write-Host "[4/5] Starting Background Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT'; pnpm --filter @rr/worker dev"

# 5. Frontend on port 5173
Write-Host "[5/5] Starting Frontend Dashboard (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT'; pnpm --filter @rr/frontend dev"

Write-Host ""
Write-Host "  Dashboard   -> http://localhost:5173" -ForegroundColor White
Write-Host "  API         -> http://localhost:3000" -ForegroundColor White
Write-Host "  ML Pipeline -> http://localhost:8000" -ForegroundColor White
```

</details>

#### Linux / Mac (bash + tmux)
Creates a named tmux session with one window per service. Falls back to background processes if tmux is not installed:

```bash
chmod +x scripts/dev-start.sh
./scripts/dev-start.sh
```

> **tmux controls:** Switch windows with `Ctrl+B → 0-4`. Detach with `Ctrl+B → D`. Re-attach with `tmux attach -t rr-dev`.

---

### Service URLs

| Service | URL | Description |
|---|---|---|
| Frontend Dashboard | http://localhost:5173 | React Operations UI |
| API Server | http://localhost:3000 | NestJS REST API |
| ML Inference | http://localhost:8000 | FastAPI XGBoost service |
| API Docs | http://localhost:3000/api/docs | Swagger UI (dev mode) |

---

### Manual Start (Alternative)

If you prefer separate terminals:

```bash
# Terminal 1 — Infra
docker compose -f infra/compose/compose.yaml up

# Terminal 2 — ML Pipeline
cd apps/ml-pipeline/src && source ../venv/bin/activate && python server.py

# Terminal 3 — API
pnpm --filter @rr/api dev

# Terminal 4 — Worker
pnpm --filter @rr/worker dev

# Terminal 5 — Frontend
pnpm --filter @rr/frontend dev
```

---

### Testing & Evaluation

| Command | Description |
|---|---|
| `pnpm lint` | Run ESLint across the monorepo |
| `pnpm test:integration` | Integration tests against live DB |
| `pnpm evaluate-smoke` | Offline batch evaluation run |

---

### Verification & Audit (Jury Validation)

To technically validate the safety and methodology of this system, we have included two deterministic audit scripts. Judges and new users can run these directly to verify the system's claims.

#### 1. Concurrency & Idempotency Audit (Resilience Test)
Validates the system prevents concurrent duplicate execution even under severe race conditions. It fires 10 identical webhook payloads at the exact same millisecond. 
**Expected result:** Exactly 1 webhook creates a case, and 9 are safely rejected with HTTP 409 Conflict.
```bash
# Run from the project root
pnpm dlx tsx scripts/resilience-test.ts
```

#### 2. Causal AI Methodology Verification (Statistical Audit)
Validates our XGBoost T-Learner architecture using the public Hillstrom MineThatData RCT (real human data, no PII risk). It trains the metalearner inline and outputs a causal inference report, demonstrating the system's ability to identify treatment strategies probabilistically.
```bash
# Run from the ml-pipeline directory
cd apps/ml-pipeline/src
python statistical_audit.py
```

---

## 8. Production Roadmap (Brief)

> The system has been explicitly designed for incremental production deployment. Each phase is architecturally independent — Phase 1 can ship before Phase 2 begins, intended to minimize architectural changes to the core system.

For the full detailed roadmap with per-phase diagrams, effort estimates, and revenue projections, see [Production Roadmap](docs/roadmap/ROADMAP.md).

```mermaid
gantt
    title Production Deployment Roadmap
    dateFormat YYYY-MM-DD
    
    section Phase 1: Live Razorpay
    Real Webhook Ingestion       :p1a, 2025-01-01, 14d
    Live Test-Mode Execution     :p1b, after p1a, 7d
    Live Customer Communication  :p1c, after p1b, 7d
    
    section Phase 2: Merchant Portal
    Self-Service Policy Config   :p2a, after p1c, 14d
    Multi-Merchant Isolation     :p2b, after p2a, 14d
    
    section Phase 3: Consent DB
    Consent Management           :p3a, after p2b, 14d
    Preference Learning          :p3b, after p3a, 14d
    
    section Phase 4: A/B Framework
    Online Experiment Harness    :p4a, after p3b, 28d
    Causal Model Retraining      :p4b, after p4a, 28d
    
    section Phase 5: Observability
    Production Monitoring        :p5a, after p1c, 120d
    Audit Compliance             :p5b, after p1c, 120d
```

*(or in text format below)*

### Deployment Phases (Text View)
- **Phase 1: Live Razorpay Integration** — Connect real Razorpay webhooks (HMAC-SHA256 verified), enable test-mode payment link creation and eNACH mandate retry, configure Twilio SMS and Resend email for live customer communication. The core system architecture remains unchanged.
- **Phase 2: Merchant Configuration Portal** — Merchant self-service UI for configuring `maxAttemptsPerCase`, `cooldownPeriodMs`, `allowedChannels`, and LLM message tone. Row-level security for strict multi-merchant data isolation.
- **Phase 3: Advanced Consent Portal & Preference Learning** — *Note: Strict DPDP Act consent enforcement is already live in Phase 1 via the Deterministic Policy Engine (which hard-blocks interventions if consent is missing).* Phase 3 will expand this by introducing a standalone customer-facing portal for granular consent management and introducing ML preference learning, which will feed channel-response data (e.g., "User prefers SMS over Email") back into the diagnostic pipeline.
- **Phase 4: A/B Experimentation Framework** — Hash-based deterministic treatment assignment for online experiments. Periodic T-Learner retraining on real merchant data with shadow scoring before promotion. Long-term migration to contextual bandit with Thompson Sampling.
- **Phase 5: Observability & Operations** — Prometheus + Grafana monitoring with automated alerts (recovery rate drops, AI fallback spikes, worker lag). 90-day immutable audit trail with cryptographic hash chain. PCI-DSS scope review and incident response runbooks.

### What Is Already Built (Production-Oriented Prototype)

| Capability | Status |
|---|---|
| Idempotent Webhook Ingestion (DB-level unique constraints) | ✅ Implemented Capability |
| Causal ML Intervention Selection (XGBoost T-Learner) | ✅ Implemented Capability |
| LLM Failure Diagnosis + 4-Locale Messaging | ✅ Implemented Capability |
| Deterministic Policy Engine (Consent, Fraud, Cooldown) | ✅ Implemented Capability |
| Execution Lock (Distributed DB Lock prevents duplicate execution) | ✅ Implemented Capability |
| Optimistic Concurrency Control (Version-based OCC) | ✅ Implemented Capability |
| Immutable Audit Trail (Full reasoning trace) | ✅ Implemented Capability |
| Reproducible Evaluation Framework (Checksummed datasets) | ✅ Implemented Capability |

### Revenue Impact Projection

| Merchant Scale | Monthly At Risk | System Recovery (20.7%) | False Intervention Cost |
|---|---|---|---|
| Small (1 merchant) | ₹4,00,000 | ₹82,800 | 0 observed in benchmark |
| Medium (10 merchants) | ₹60,00,000 | ₹12,42,000 | 0 observed in benchmark |
| Large (100 merchants) | ₹10,00,00,000 | ₹2,07,00,000 | 0 observed in benchmark |
| Enterprise (1000+ merchants) | ₹175,00,00,000 | ₹36,22,50,000 | 0 observed in benchmark |

> **Key Insight:** 0 false interventions were observed in the benchmark. ML/LLM signals are bounded by deterministic policy.

---

## 9. Documentation Index

> This README is the **single source of truth**. All feature docs below are kept in sync with every code change. If capabilities, APIs, or evaluation results change, this file and the relevant feature doc are updated in the same commit.

### Feature Documentation

Each feature doc explains: Problem → Design → Data Flow → AI Involvement → Safety Constraints → Failure Cases.

| Feature Doc | What It Covers |
|---|---|
| [CASES.md](docs/features/CASES.md) | Revenue case lifecycle, state machine transitions, OCC, terminal state guards |
| [INGESTION.md](docs/features/INGESTION.md) | Webhook ingestion, DB-level idempotency, duplicate event blocking, auth validation |
| [PLANNING.md](docs/features/PLANNING.md) | AI + ML planning pipeline — T-Learner CATE scores, LLM diagnosis, intervention selection logic |
| [POLICIES.md](docs/features/POLICIES.md) | Deterministic policy engine — consent gate, fraud gate, cooldown, max-attempt enforcement |
| [INTERVENTIONS.md](docs/features/INTERVENTIONS.md) | Intervention types, at-most-once execution lock, provider adapter pattern |
| [WORKER.md](docs/features/WORKER.md) | BullMQ worker, Razorpay adapter, distributed lock mechanism, retry/dead-letter behavior |
| [AI_MESSAGING.md](docs/features/AI_MESSAGING.md) | LLM messaging pipeline, 4-locale support (EN/Hinglish/Tamil/Kannada), safety prompting, fallback templates |
| [ML_PIPELINE.md](docs/features/ML_PIPELINE.md) | XGBoost T-Learner architecture, CATE estimation, Hillstrom dataset, FastAPI inference server |

### Architecture & Decisions

| Document | Description |
|---|---|
| [Architecture & Systems Design](docs/architecture/) | Detailed diagrams and sequence flows of ingestion and execution pipelines |
| [Architectural Decision Records](docs/decisions/) | Immutable records of why NestJS, XGBoost, Prisma, BullMQ were chosen |
| [Security, Compliance & Data Privacy](SECURITY.md) | Defense-in-depth architecture, webhook cryptography, and synthetic PII risk isolation |
| [Failure Mode Recovery](docs/failures/FAILURES.md) | All 7 failure scenarios documented with evidence trails and test references |
| [Evaluation Methodology](docs/evaluation/EVALUATION.md) | Metrics framework, baselines, latest benchmark results, and cost-model interpretation |
| [Production Roadmap](docs/roadmap/ROADMAP.md) | 5-phase plan for live Razorpay merchant deployment |


