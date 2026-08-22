# Deployment Readiness Checklist

This document tracks the requirements for deploying the Razorpay AI Revenue Recovery system to a staging or production environment.

## 1. Infrastructure Requirements
- [x] PostgreSQL 16+ available.
- [x] Redis 7+ available.
- [x] Node.js 20+ runtime for API and Worker processes.
- [x] Docker and Docker Compose configured for isolated deployment.

## 2. Configuration & Secrets
- [x] Environment variables validated on startup (`configuration.ts`).
- [x] `DATABASE_URL` format verified.
- [x] `RAZORPAY_MODE` strict checks enforced for non-production environments.
- [x] `.env` files explicitly ignored in `.dockerignore` and `.gitignore`.

## 3. Database Migrations
- [x] `prisma db push` deprecated.
- [x] Migration baseline established (`00000000000000_init_baseline`).
- [x] CI/CD pipelines updated to use `prisma migrate deploy`.
  - **Manual Intervention Required on Existing Local DBs**: Run `pnpm --filter @rr/persistence exec prisma migrate resolve --applied 00000000000000_init_baseline` to mark the baseline as applied without dropping data.

## 4. Security & Hardening
- [x] Compose ports bound to `127.0.0.1` to prevent external exposure.
- [x] RBAC API Tokens configured.
- [x] Bounded AI execution enforced (LLM cannot trigger direct API calls).
- [ ] TLS/HTTPS configured for the reverse proxy.

## 5. Observability
- [x] JSON logging enabled (Pino).
- [x] Audit logging implemented for all state changes.
- [ ] Prometheus metrics endpoint exposed and secured.

## Deployment Instructions (Demo)
To start the demo environment securely:
1. Copy `infra/env/demo.env.example` to `infra/env/demo.env`.
2. Do not add real production credentials to `demo.env`.
3. Run `docker-compose -f infra/compose/compose.yaml up -d`.
4. Access the API at `http://127.0.0.1:3000` and the Dashboard at `http://127.0.0.1:5173`.
