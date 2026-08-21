# ADR-018: Docker Compose Demo Environment

**Status:** Accepted
**Date:** 2026-08-22
**Context:** Phase 5.2 (Local Developer & Demo Experience)

## Context and Problem Statement
We need a robust, reproducible, one-command setup for reviewers and developers to run the AI Revenue Recovery system locally. The setup must run the entire architecture (Postgres, Redis, API, Worker, Frontend) without requiring live LLM or Razorpay credentials. It must be safe and not pretend to be a production deployment.

## Decision
We will use **Docker Compose** with multi-stage Dockerfiles.
- **Base image:** Node 22 Alpine.
- **Package Manager:** pnpm via corepack.
- **Compose structure:** Main file in `infra/compose/compose.yaml` with an included root `compose.yaml`.
- **Profiles:** `evaluation` and `failure-demo` profiles for one-shot tasks.

## Rationale
1. **Simplicity:** Docker Compose is the standard for local multi-container development. `docker compose up --build` provides an immediate out-of-the-box experience.
2. **Reproducibility:** Multi-stage builds guarantee that everyone is building and running the exact same binaries regardless of host Node versions.
3. **Safety:** By strictly using a `demo` environment with `RAZORPAY_MODE=test` and `LLM_ENABLED=false` as defaults, we prevent accidental live financial actions.
4. **Why not Kubernetes?** Kubernetes introduces massive overhead (minikube/k3d, helm charts, manifests) that is unnecessary for a Buildathon demo. Docker Compose strikes the right balance between containerization and developer ergonomics.

## Consequences
- **Positive:** Reviewers can run the entire system with zero configuration or dependency installation (other than Docker).
- **Negative:** Docker desktop resource consumption can be high on some host machines.
- **Mitigation:** We use minimal Alpine images and prune dependencies down to production-only modules for the runtime stages.
