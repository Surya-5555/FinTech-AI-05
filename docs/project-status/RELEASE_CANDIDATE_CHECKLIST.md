# Release Candidate Checklist

**Date**: 2026-08-22
**Branch**: `main`
**Commit**: See latest `git log --oneline -1`

## Verified Commands and Results

| Command | Result | Duration |
|---------|--------|----------|
| `pnpm install --frozen-lockfile` | ✅ Pass | ~2s |
| `pnpm lint` | ✅ Pass (0 errors) | ~3s |
| `pnpm build` | ✅ Pass (api, worker, frontend, libs) | ~12s |
| `cd apps/api && npx vitest run -c vitest.e2e.config.ts` | ✅ 5 files, 13 tests, all pass | ~4s |
| `pnpm test` | ✅ Pass (with --passWithNoTests) | ~2s |

## Required Environment Variables

For local development (`.env`):
```
DATABASE_URL=postgresql://user:pass@localhost:5432/razorpay_rr
REDIS_URL=redis://localhost:6379
API_AUTH_TOKEN=<any-string>
APP_ENV=development
LOG_LEVEL=info
```

Optional (for AI features):
```
LLM_API_KEY=<provider-key>
LLM_MODEL=<model-name>
```

Optional (for Razorpay Test Mode):
```
ENABLE_RAZORPAY_TEST_MODE=true
RAZORPAY_KEY_ID=rzp_test_<key>
RAZORPAY_KEY_SECRET=<secret>
```

## Docker Compose Stack

```bash
docker compose -f infra/compose/compose.yaml up --build -d
# Services: postgres, redis, api, worker, frontend
# Frontend: http://localhost:5173
# API: http://localhost:3000
# Health: http://localhost:3000/health/live
```

## Evaluation Commands

```bash
# Batch evaluation over 500 synthetic cases
pnpm evaluate-smoke

# Dataset location: data/evaluation/v1/
# Seed: 42 (deterministic)
# Output: artifacts/ directory
```

## Track 03 Evidence Checklist

| Requirement | Status | Evidence |
|---|---|---|
| Batch measured revenue recovery | ✅ | `libs/evaluation/src/metrics/calculator.ts` |
| Baseline comparison (No Recovery + Naive Retry) | ✅ | `libs/evaluation/src/baselines/` |
| Compliant escalation | ✅ | `libs/domain/src/state-machine.ts` → `escalate()` |
| Deterministic stopping rules | ✅ | `libs/domain/src/policy.ts` → maxAttemptsPerCase |
| Complete audit trail | ✅ | `AuditLog` table, outbox pattern |
| AI bounded to reasoning | ✅ | LLM has no tools/function-calling, no DB access |
| Idempotent ingestion | ✅ | DB unique constraint, verified by integration test |
| At-most-once execution | ✅ | Distributed lock, verified by integration test |
| Optimistic concurrency | ✅ | Version field on RevenueCase |
| Consent enforcement | ✅ | Policy engine blocks missing consent |
| Reproducible evaluation | ✅ | Seeded PRNG, SHA-256 checksummed dataset |
| Operations console | ✅ | React frontend with cases, dashboard, evaluation pages |
| Auth on mutations | ✅ | `OperatorAuthGuard` with Bearer token |
| No secrets in repo | ✅ | `.env` gitignored, `.env.example` has placeholders only |

## Submission Form Checklist

- [ ] Repository URL: `https://github.com/Surya-5555/RazorPay-Buildathon`
- [ ] Branch: `main`
- [ ] README describes the system end-to-end
- [ ] Evaluation methodology documented in `docs/evaluation/EVALUATION.md`
- [ ] Security model documented in `SECURITY.md` and `docs/security/SECURITY.md`
- [ ] Architecture documented in `docs/architecture/`
- [ ] 18 ADRs in `docs/decisions/`
- [ ] Failure scenarios in `docs/failures/FAILURES.md`
- [ ] Evidence map in `docs/EVIDENCE_MAP.md`

## Reviewer Journey (First 10 Minutes)

1. **Open `README.md`** — understand what the system does, architecture, and setup
2. **Open `docs/EVIDENCE_MAP.md`** — see how each requirement maps to code, test, and docs
3. **Run `cd apps/api && npx vitest run -c vitest.e2e.config.ts`** — verify 13 tests pass (no DB needed)
4. **Browse `docs/evaluation/EVALUATION.md`** — understand the evaluation methodology
5. **Browse `docs/failures/FAILURES.md`** — see the 7 failure scenarios with test evidence
6. **Browse `SECURITY.md`** — understand auth, AI boundary, and idempotency
7. **Browse `docs/decisions/`** — 18 architectural decision records
8. **Browse `apps/frontend/src/features/`** — see the operations console pages
9. **Run `pnpm build`** — verify everything compiles
10. **Run `docker compose -f infra/compose/compose.yaml up --build -d`** — see the full stack
