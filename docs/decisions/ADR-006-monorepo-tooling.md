# ADR-006: pnpm Workspaces for Monorepo Tooling

**Status:** Accepted
**Date:** 2026-08-04
**Context:** Repository Structure

## Context and Problem Statement
The system consists of multiple discrete components: a NestJS API backend, a BullMQ Worker process, a Causal ML Evaluator script, a React Operations Dashboard, and shared libraries (Domain, Contracts, Persistence). Managing these as separate repositories creates friction in CI/CD, dependency management, and type sharing. A monorepo is required, but we must choose the right tool to manage it without introducing excessive complexity.

## Decision
We will use **pnpm workspaces** as the sole monorepo management tool. We explicitly reject heavy abstractions like Nx or Lerna.

## Rationale
1. **Speed and Efficiency:** pnpm uses a global store and hard links, drastically reducing the disk space and installation time required for the multiple Node.js projects in this repository.
2. **Simplicity:** The project strictly limits complex meta-frameworks. Nx introduces heavy configuration overhead and custom caching layers that obscure standard Node.js build processes. pnpm workspaces rely on the standard `package.json` resolutions, making it transparent and easy to debug.
3. **Type Sharing:** pnpm workspaces allow us to flawlessly link local packages (e.g., `"@rr/domain": "workspace:*"`). This ensures that when the API or Worker compiles, it perfectly inherits the exact TypeScript interfaces defined in the shared libraries.
4. **Recursive Execution:** The `pnpm -r` command allows us to easily run standard scripts (`lint`, `typecheck`, `build`, `test`) across all apps and libs concurrently in CI without needing an external orchestrator.

## Consequences
- Requires careful management of `tsconfig.json` references (`composite: true`, or careful `rootDir` management) to ensure TypeScript correctly resolves inter-workspace dependencies during builds.
