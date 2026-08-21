# Razorpay Revenue Recovery — Tech Stack Decision Document

This document locks the complete technology stack for the **Track 03 – AI Revenue Recovery** project and explains *why* each decision was made, *why* competing options were rejected, and how the chosen stack scales without breaking when moved toward Razorpay‑like production environments.

Labels:
- **[VERIFIED]**: Directly supported by Razorpay or primary sources.
- **[INFERENCE]**: Strongly inferred from public evidence.
- **[RECOMMENDATION]**: Our deliberate design decision for this project.

---

## 1. Design Principles

1. **Fintech safety first**: Never let AI directly control money movement. All money actions are deterministic, idempotent, and audited.
2. **Evaluation‑first**: The system must prove measured money recovered across a batch with baselines and honest metrics.
3. **Production‑minded, not infra cosplay**: Adopt Razorpay’s engineering philosophy and patterns without copying their full-scale infra where it is unnecessary.
4. **Scalable design, simple implementation**: Architecture must scale conceptually to millions of events, while the Buildathon implementation stays small and tractable.
5. **AI judgment, not AI everywhere**: Use AI only where uncertainty and human‑like judgment genuinely exist.

---

## 2. Workload Assumptions

### 2.1 Buildathon Workload

- Merchants: 3–5 synthetic merchants.
- Events per batch: ~500–1,000 (payments, subscriptions, invoices).
- Total events across experiments: ~5,000–10,000.
- Concurrent workers: a few async workers processing Redis queues.
- Latency tolerance: seconds to minutes; near‑real‑time is not required.
- Inference volume: a few hundred LLM calls and ML predictions per batch.

### 2.2 Conceptual Production Workload

- Merchants: thousands to tens of thousands.
- Events: millions per day.
- Latency tolerance: near‑real‑time for some flows (e.g., payment degradation).
- Infra: Kafka, Flink, EMR‑style pipelines, HA Postgres, Redis clusters, Kubernetes.

**Implication:** We design interfaces and boundaries to allow migration to Kafka/Flink/Kubernetes later, but **do not** implement them during the Buildathon.

---

## 3. Technology Decision Matrix

### Legend

- **Winner**: the chosen technology.
- **Why**: core reasons.
- **Why not others**: key trade‑offs.
- **Scale & risk**: why this won’t break at scale.

---

### 3.1 Backend Language & Framework

**Category:** Backend runtime & framework  \
**Options considered:**
- Node.js + TypeScript + NestJS  
- Go + standard library  
- Java + Spring Boot  
- Python + FastAPI

**Winner:** **Node.js + TypeScript + NestJS**  \
**Label:** [RECOMMENDATION]

**Why:**
- Razorpay maintains official Node.js SDKs and tooling; Node is clearly a first‑class language for merchants integrating with Razorpay.[VERIFIED]
- Razorpay senior backend JDs specifically mention **NestJS, Node.js, PostgreSQL, Redis/Valkey**, showing NestJS is a real part of their backend ecosystem.[VERIFIED]
- TypeScript + NestJS gives strong typing, inversion of control, module separation, and decorators that make domain modules, state machines, and policy engines clean to implement.
- The same language (TS) can be used across backend and some tooling (evaluation, scripts) reducing cognitive overhead.

**Why not Go:**
- Go is excellent for high‑performance microservices, and Razorpay uses Go in some SDKs and services.[INFERENCE]
- For a single‑team Buildathon project, Go’s extra boilerplate and lack of shared language with the frontend provide less benefit than TypeScript’s full‑stack consistency.

**Why not Java + Spring Boot:**
- Strong, enterprise‑grade, but heaviest in terms of boilerplate, build tooling, and startup time.
- Overkill for a modular monolith where TypeScript already meets the necessary engineering standard.

**Why not Python + FastAPI:**
- Python is ideal for ML, but NestJS aligns better with Razorpay’s advertised backend stack.
- We still use Python for optional ML components, but not as the main application runtime.

**Scale & risk:**  
NestJS can be deployed behind load balancers and on Kubernetes without changes. If scale demands, services can be split into microservices (ingestion, engine, executor, evaluation) using the same stack. There is low migration risk.

---

### 3.2 Frontend Framework

**Category:** Frontend  \
**Options considered:** React, Vue, Angular

**Winner:** **React + Vite + TypeScript + Tailwind**  \
**Label:** [RECOMMENDATION]

**Why:**
- React is widely used in fintech dashboards and is part of Razorpay’s public stack.[VERIFIED]
- Vite gives very fast dev builds and simple config.
- TypeScript provides type safety, aligning with backend.
- Tailwind CSS keeps styling systematic and enables internal‑tool aesthetics.

**Why not Vue/Angular:**
- No evidence Razorpay is strongly Vue/Angular‑centric; React is the safe default.
- Our goal is not framework novelty but clarity and speed.

**Scale & risk:**  
React scales well to complex dashboards; changes can be incremental. Swapping to another frontend later is decoupled from backend via REST APIs.

---

### 3.3 Database

**Category:** Primary data store  \
**Options considered:** PostgreSQL, MySQL, MongoDB, SQLite

**Winner:** **PostgreSQL**  \
**Label:** [RECOMMENDATION]

**Why:**
- Razorpay’s data and backend posts show heavy use of relational stores (MySQL/Postgres/timescaledb) with strong schema discipline.[VERIFIED]
- Back‑end job postings explicitly mention PostgreSQL, indicating it is a primary OLTP store.[VERIFIED]
- We need ACID transactions and strong referential integrity for money workflows.
- JSON support allows flexible storage of raw event payloads and metrics.

**Why not MySQL:**
- MySQL is equally capable for OLTP but Postgres offers better JSON, richer types, and is explicitly called out in Razorpay JDs.

**Why not MongoDB:**
- Document stores complicate transactional workflows and strong constraints; money systems benefit from relational schemas.

**Why not SQLite:**
- Appropriate for local dev only; not realistic for a system that aspires to production.

**Scale & risk:**  
Postgres is proven at large fintech scale. For future scaling, we can move to managed HA, read replicas, and partitioning without changing our logical schema.

---

### 3.4 Cache & Queue

**Category:** Async processing & caching  \
**Options considered:** Redis + BullMQ, Kafka, RabbitMQ, Celery/Redis

**Winner:** **Redis + BullMQ**  \
**Label:** [RECOMMENDATION]

**Why:**
- Razorpay is a Redis customer; a RedisDays India talk discusses how they use Redis to scale payments with ML.[VERIFIED]
- Redis + BullMQ gives:
  - Delayed jobs,
  - Retries with backoff,
  - Simple worker model,
  - Excellent TypeScript integration.
- Perfect for our workload: scheduling and executing recovery interventions asynchronously.

**Why not Kafka (for Buildathon):**
- Razorpay uses Kafka + Flink + EMR for streaming data and Mitra; that’s excellent at production scale.[VERIFIED]
- For a Buildathon project handling thousands (not millions) of events, Kafka adds heavy operational overhead and complexity with minimal benefit.
- We instead define a `JobQueue` abstraction so Kafka can replace Redis in the future without rewriting business logic.

**Why not RabbitMQ/Celery:**
- RabbitMQ is solid but adds extra moving parts without clear advantages over Redis for our scale.
- Celery targets Python stacks; our main app is Node.

**Scale & risk:**  
Redis queues can scale reasonably far (tens/hundreds of thousands of jobs). When we outgrow it, shifting the queue implementation to Kafka is a back‑compatible evolution.

---

### 3.5 AI / LLM Layer

**Category:** LLM for messaging & explanations  \
**Options considered:** Hosted Claude / OpenAI, self‑hosted open‑source models, no LLM

**Winner:** **Hosted Claude/ChatGPT‑class LLM via a `LLMClient` abstraction**  \
**Label:** [RECOMMENDATION]

**Why:**
- Razorpay’s Agentic Payments and Agent Studio are built on Claude/ChatGPT‑class models; they publicly talk about Claude integrations with NPCI and ChatGPT commerce.[VERIFIED]
- Hosted LLMs provide:
  - High accuracy for multilingual/Hinglish messaging,
  - Tool‑friendly structured output,
  - Low operational burden.
- We restrict LLM responsibilities to:
  - Generating customer‑facing messages,
  - Generating explanations for human reviewers.

**Why not self‑hosted models:**
- Adds infra complexity (GPU, model ops) with minimal extra signal for Razorpay.
- Hosted LLM suffices to show AI integration and judgment.

**Why not “no LLM”:**
- We want to demonstrate **AI capability**, not only rules. Message generation is a natural, safe use of LLMs.

**Scale & risk:**  
We call LLMs at relatively low volumes. If cost/latency becomes a concern, we can cache outputs or switch to smaller hosted models. The `LLMClient` abstraction avoids vendor lock‑in.

---

### 3.6 ML Classifier

**Category:** Recovery propensity / root‑cause model  \
**Options considered:** XGBoost, logistic regression, neural networks, rules only

**Winner:** **XGBoost (optional)**  \
**Label:** [RECOMMENDATION]

**Why:**
- Razorpay’s Mitra platform uses XGBoost‑style models on Flink for streaming risk decisions.[VERIFIED]
- For tabular features (amounts, bank, channel, time, failure reason), XGBoost is a robust choice.
- We treat it as **optional**: rules must still provide a working system; XGBoost enhances prioritization and propensity scoring.

**Why not neural networks:**
- More complex to train and explain; little marginal benefit on tabular features.

**Why not rules only:**
- Rules can handle baseline logic, but adding a model shows ML capability without compromising clarity.

**Scale & risk:**  
ML is used in evaluation and prioritization; failure or removal of the model does not break core workflows.

---

### 3.7 Object Storage

**Category:** Dataset & model artifact storage  \
**Options considered:** Local filesystem, S3, GCS

**Winner:** **Local `data/` directory (design as S3 abstraction)**  \
**Label:** [RECOMMENDATION]

**Why:**
- For Buildathon, local files are sufficient; they keep setup simple.
- Code treats storage behind an interface that could be backed by S3 later.

**Scale & risk:**  
At production scale, migrating to S3/MinIO is straightforward given abstraction.

---

### 3.8 Observability

**Category:** Logging & metrics  \
**Options considered:** Logs only, logs + Prometheus metrics, full tracing (OpenTelemetry)

**Winner:** **Structured JSON logs + Prometheus‑style metrics**  \
**Label:** [RECOMMENDATION]

**Why:**
- Razorpay’s data infrastructure content emphasises monitoring, log analytics, and metrics, but detailed tracing is not necessary for a Buildathon.[VERIFIED]
- Logs capture state transitions, interventions, and errors.
- Metrics expose key counters and histograms to demonstrate production thinking.

**Why not full tracing:**
- Adds complexity (OTEL collectors, exporters) with limited payoff at this scale.

**Scale & risk:**  
Adding full tracing later is additive; existing logs/metrics are foundational.

---

### 3.9 Deployment & Containerisation

**Category:** Deployment  \
**Options considered:** Bare metal, Docker, Docker Compose, Kubernetes

**Winner:** **Docker + Docker Compose**  \
**Label:** [RECOMMENDATION]

**Why:**
- Razorpay’s production clearly uses Kubernetes & EMR, but replicating that in a Buildathon is unnecessary.[VERIFIED]
- Docker Compose allows:
  - Reproducible multi‑service setup,
  - Realistic separation of concerns,
  - Easy local runs.

**Why not Kubernetes:**
- Adds significant operational complexity without improving the engineering signal for this scale.

**Scale & risk:**  
Migrating to Kubernetes later is straightforward: each service already runs as a Docker container.

---

### 3.10 CI/CD

**Category:** Continuous integration  \
**Options considered:** None, GitHub Actions, external CI (CircleCI, Jenkins)

**Winner:** **GitHub Actions**  \
**Label:** [RECOMMENDATION]

**Why:**
- Razorpay’s public GitHub repos use tags, changelogs, and standard CI workflows.[VERIFIED]
- GitHub Actions is tightly integrated with GitHub and sufficient for tests + evaluation.

**Scale & risk:**  
Action workflows can be extended for deployment and multi‑env setups later.

---

## 4. Final Stack Summary

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS.
- **Backend:** NestJS (Node.js + TypeScript) modular monolith.
- **Database:** PostgreSQL.
- **Cache & Queue:** Redis + BullMQ.
- **AI:** Hosted Claude/ChatGPT‑class LLM via `LLMClient` for message generation & explanations.
- **ML:** Optional XGBoost classifier (Python) for recovery propensity.
- **Storage:** Local `data/` directory (S3‑compatible abstraction).
- **Observability:** Pino-style JSON logs, Prometheus‑style metrics endpoint.
- **Deployment:** Docker + Docker Compose.
- **CI/CD:** GitHub Actions.

Every choice is:
- Grounded in Razorpay’s public engineering patterns where possible,
- Justified by workload and production concerns,
- Designed to scale without a rewrite,
- Simplified enough for a Buildathon while still looking like a serious fintech AI system.
