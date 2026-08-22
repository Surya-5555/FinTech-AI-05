# Prisma Migration Baseline (ADR-020)

**Date**: 2026-08-22
**Status**: Accepted
**Track**: 03 — AI Revenue Recovery

## Context

During initial prototyping and scaffolding (Phases 1-5), the database schema was synchronized using `prisma db push`. This was sufficient for rapid iteration locally but is unsafe for production, CI/CD pipelines, and shared test environments because `db push` can silently drop data if the schema drifts or is restructured.

As the system moves into Phase 6 (Security and Deployment Readiness) and prepares for integration with the production control plane, we need a deterministic, reversible, and auditable way to manage schema changes.

## Decision

We will transition from `prisma db push` to Prisma's formal migration system (`prisma migrate`).
Because the local environment already contains tables generated via `db push`, we will establish a **migration baseline**.

The process implemented in Phase 6.1:
1. Created an initial migration `00000000000000_init_baseline` representing the current schema state.
2. Going forward, all `db push` commands are banned.
3. CI/CD pipelines and Docker environments will use `prisma migrate deploy`.

## Consequences

### Positive
- Schema changes are now deterministic and version-controlled.
- Rollbacks and schema audits are possible.
- Safe deployments to staging and production environments without data loss.

### Negative
- Slightly slower development loop when changing schemas (must run `prisma migrate dev --name <feature>`).
- Developers must manually mark the baseline as applied on existing local databases: `pnpm --filter @rr/persistence exec prisma migrate resolve --applied 00000000000000_init_baseline`.
