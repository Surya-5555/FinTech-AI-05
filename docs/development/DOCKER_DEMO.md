# Docker Demo Environment

This guide explains how to use the Docker Compose setup to run a local demo of the Razorpay AI Revenue Recovery system.

## Prerequisites
- Docker & Docker Compose installed.
- Make (optional, but recommended).

## Setup
By default, the demo runs without requiring any external keys (no LLM keys, no Razorpay keys). It uses a self-contained test environment internally.

1. Copy the demo env file:
   ```bash
   cp infra/env/demo.env.example infra/env/demo.env
   ```

2. Start the infrastructure:
   ```bash
   make demo-up
   # or
   docker compose up --build -d
   ```

## Included Services
- **rr-postgres:** PostgreSQL 16 (internal port 5432).
- **rr-redis:** Redis 7 (internal port 6379).
- **rr-api:** NestJS Backend API (exposed on http://localhost:3000).
- **rr-worker:** Background processor for queue jobs (no exposed ports).
- **rr-frontend:** React Dashboard UI (exposed on http://localhost:5173).

## Running the Smoke Test
Once the stack is up, you can run a test failure and recovery cycle:
```bash
make demo-smoke
```

## Running the Evaluator
To run the evaluation framework against the synthetic test data:
```bash
make demo-evaluate
```

## Resetting State
To completely wipe the database and queues and start fresh:
```bash
make demo-reset
```

> **Note:** This is strictly a local demonstration environment. It is not secure or suitable for production deployment.
