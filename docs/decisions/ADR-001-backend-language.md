# ADR-001: Strict TypeScript / Node.js Ecosystem for Backend

**Status:** Accepted
**Date:** 2026-08-01
**Context:** Initial Technology Selection

## Context and Problem Statement
The Razorpay AI Revenue Recovery system requires a backend capable of high concurrency, seamless API integrations (Razorpay, Twilio, LLMs), and rapid iteration. However, strict constraints for this specific project prohibit the use of Go, Rust, and Python for the core backend. The system must process webhooks, run causal ML evaluations, and execute asynchronous tasks reliably.

## Decision
We will build the entire backend infrastructure exclusively using **TypeScript on Node.js**.

## Rationale
1. **Constraint Compliance:** Adheres strictly to the "No Go/Rust" and "No Python for Backend" rules established by the project parameters.
2. **Ecosystem & Libraries:** Node.js possesses the richest ecosystem for API integration, asynchronous IO, and SDKs (Prisma, Stripe/Razorpay SDKs, OpenAI/Anthropic SDKs).
3. **Isomorphic Types:** Using TypeScript allows us to share domain entities, validation schemas (Zod), and API contracts seamlessly between the backend (NestJS), the workers (BullMQ), and the frontend operations dashboard (React).
4. **Asynchronous Throughput:** Node.js's event-driven architecture is ideally suited for IO-heavy workloads like dispatching hundreds of concurrent webhooks or awaiting LLM responses without blocking the main thread.

## Consequences
- Requires strict TypeScript compiler flags (`strict: true`, `noImplicitAny: true`) to prevent runtime type failures.
- CPU-heavy tasks (like the Causal ML inference) must be offloaded to isolated processes or handled via optimized external binaries (e.g., executing XGBoost via native bindings or microservices) to avoid event-loop starvation.
