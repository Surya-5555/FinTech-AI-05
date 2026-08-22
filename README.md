# Razorpay AI Revenue Recovery

**Detect failed payments, diagnose root causes with AI, select bounded recovery interventions, execute them safely, and measure the outcome — with a complete audit trail.**

## The Problem

Indian merchants on Razorpay lose revenue when recurring payments fail — card expiry, insufficient funds, bank timeouts, CVV mismatches. Most merchants either do nothing (losing the revenue) or blindly retry (annoying customers, wasting API calls on fraud-flagged transactions). There is no intelligent, measured system that decides *which* recovery action to take, *whether* it is safe to take it, and *how much* revenue was actually recovered.

## What This System Does

This is an end-to-end revenue recovery pipeline for Razorpay Track 03:

1. **Ingest** failed payment events via REST API (simulating Razorpay webhooks)
2. **Create** revenue-at-risk cases with idempotent duplicate detection
3. **Diagnose** failure root cause and select recovery strategy (AI-assisted)
4. **Plan** a bounded intervention (payment retry, payment link, SMS/email notification)
5. **Validate** the plan against merchant policies, customer consent, and stopping rules
6. **Execute** the intervention via external adapters (Razorpay Test Mode, Twilio, Resend)
7. **Record** the outcome with full audit trail
8. **Evaluate** recovery performance against baselines using reproducible batch metrics

## Where AI Is Used (and Where It Is Not)

| AI-Powered | Deterministic (Not AI) |
|---|---|
| Root-cause diagnosis explanation | Event ingestion and deduplication |
| Recovery message drafting (empathetic customer comms) | State machine transitions |
| Decision explanation for operator review | Policy validation and consent checks |
| | Intervention execution and idempotency |
| | Stopping rules and escalation |
| | Financial calculations (BigInt, no floats) |
| | Evaluation metrics computation |

AI acts as a **reasoning advisor**. It cannot directly execute financial actions, bypass policy gates, or mutate case state. If the AI provider is unavailable, the system falls back to deterministic templates and continues operating.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend   │────▶│   NestJS API │────▶│  PostgreSQL  │
│  React/Vite │     │  (REST)      │     │  (Prisma)    │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────▼───────┐     ┌──────────────┐
                    │   BullMQ     │────▶│    Redis      │
                    │   Worker     │     │              │
                    └──────┬───────┘     └──────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Razorpay │ │  Twilio  │ │  Resend  │
        │ Test API │ │  (SMS)   │ │  (Email) │
        └──────────┘ └──────────┘ └──────────┘
```

**Stack**: Node.js 22 · NestJS · TypeScript · Prisma · PostgreSQL · Redis · BullMQ · React 18 · Vite · Tailwind CSS

**Monorepo packages**:
- `apps/api` — NestJS REST API (ingestion, cases, planning, policies, dashboard, evaluation)
- `apps/worker` — BullMQ background processor (intervention execution)
- `apps/frontend` — React operations console (cases, dashboard, evaluation viewer)
- `apps/evaluator` — CLI batch evaluation runner
- `libs/domain` — State machine, policy engine, planning logic
- `libs/contracts` — Shared TypeScript types and enums
- `libs/persistence` — Prisma schema, repositories, mappers
- `libs/evaluation` — Metrics calculator, baselines, dataset loader
- `libs/llm` — LLM client abstraction with fallback templates

## Prerequisites

- Node.js ≥ 22 LTS
- pnpm (via `corepack enable`)
- PostgreSQL 16 (or use Docker Compose)
- Redis 7 (or use Docker Compose)

## Local Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env
# Edit .env with your DATABASE_URL and REDIS_URL

# 3. Run database migrations
pnpm --filter @rr/persistence prisma migrate deploy

# 4. Start the API
pnpm --filter @rr/api dev

# 5. Start the frontend (separate terminal)
pnpm --filter @rr/frontend dev
# Dashboard at http://localhost:5173
```

## Docker Compose (Full Stack)

Brings up PostgreSQL, Redis, API, Worker, and Frontend in one command:

```bash
# Start all services
docker compose -f infra/compose/compose.yaml up --build -d

# Check health
docker compose -f infra/compose/compose.yaml ps

# View logs
docker compose -f infra/compose/compose.yaml logs -f api worker

# Tear down
docker compose -f infra/compose/compose.yaml down
```

The operations dashboard is available at `http://localhost:5173` and the API at `http://localhost:3000`.

## Demo Mode vs Razorpay Test Mode

| | Demo Mode | Razorpay Test Mode |
|---|---|---|
| **External calls** | None — all adapters are simulated | Calls Razorpay sandbox API |
| **Requires keys** | No | Yes (`rzp_test_` prefixed keys) |
| **Money movement** | Simulated amounts only | Sandbox — no real money |
| **When to use** | Quick local review, CI | Testing Razorpay payment link creation |

To enable Razorpay Test Mode:
```bash
ENABLE_RAZORPAY_TEST_MODE=true
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_test_secret
```

## Test Commands

```bash
# E2E API tests (no database required — uses mocks)
cd apps/api && npx vitest run -c vitest.e2e.config.ts

# Integration tests (requires running PostgreSQL + Redis)
pnpm test:integration

# Batch evaluation (deterministic, no external calls)
pnpm evaluate-smoke

# All quality checks
make verify
```

## Evaluation

The evaluation framework compares the AI-powered recovery system against two baselines using a reproducible synthetic dataset (500 cases, seeded PRNG, SHA-256 checksummed):

- **Baseline 0 (No Recovery)**: Do nothing. Measures organic recovery.
- **Baseline 1 (Naive Retry)**: Blindly retry the first allowed channel.
- **System Under Test**: AI-assisted diagnosis → policy-bounded intervention → measured outcome.

All monetary calculations use `BigInt` to prevent floating-point precision loss. Integrity assertions reject any run where recovered > at-risk.

See [docs/evaluation/EVALUATION.md](docs/evaluation/EVALUATION.md) for full methodology, metrics, and commands.

## Limitations

- **Synthetic Data:** The evaluation dataset and recovery outcomes are fully synthetic (simulated) to ensure reproducibility without exposing real merchant data.
- **Simulated Execution:** The Razorpay test-mode adapter is opt-in and separate from the default local evaluation runs.
- **Future Scope:** Production High-Availability (HA), actual merchant POS integration, and real customer communications (live SMS/email) are future scope.
- **Demo Boundary:** This repository demonstrates the *architecture, safety, and evaluation framework* of an AI Revenue Recovery system. It does not claim live production deployment, live merchant financial impact, or regulatory compliance certification.

## Security

- **Auth**: Bearer token guard on all mutation endpoints. Read endpoints open for demo.
- **LLM boundary**: AI cannot execute financial actions or bypass policy gates.
- **Input validation**: `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`.
- **Log redaction**: Authorization headers, cookies, tokens, API keys redacted from Pino logs.
- **Secrets**: Environment variables only. `.env.example` contains no real credentials.
- **Fail-closed**: Missing auth token → 401. Invalid Razorpay key prefix → boot crash.

See [SECURITY.md](SECURITY.md) for full details.

## Documentation

| Document | Path |
|---|---|
| Security & Auth Model | [SECURITY.md](SECURITY.md) |
| Architecture | [docs/architecture/](docs/architecture/) |
| Evaluation Methodology | [docs/evaluation/EVALUATION.md](docs/evaluation/EVALUATION.md) |
| Failure & Resilience Scenarios | [docs/failures/FAILURES.md](docs/failures/FAILURES.md) |
| Architectural Decision Records | [docs/decisions/](docs/decisions/) |
| Implementation Audit | [docs/project-status/IMPLEMENTATION-COMPLETENESS-AUDIT.md](docs/project-status/IMPLEMENTATION-COMPLETENESS-AUDIT.md) |
