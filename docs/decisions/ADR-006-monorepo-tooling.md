# ADR 006: Monorepo Tooling

## Context
We need a robust, scalable, and strict workspace for the AI Revenue Recovery system.

## Decisions
- **pnpm**: Chosen for strict symlinking, speed, and `pnpm-workspace.yaml` simplicity.
- **Strict TypeScript**: Ensures type safety and bounds across boundaries, avoiding implicit `any` bugs.
- **Workspace Boundaries**: Divided cleanly into `apps/` (executable units) and `libs/` (reusable domain/infrastructure code).
- **No Application Framework Yet**: Initialized purely structural configuration to establish the baseline rules and path aliases before introducing NestJS or React complexity.
