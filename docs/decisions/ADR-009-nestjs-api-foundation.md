# ADR-009: NestJS for API Foundation

**Status:** Accepted
**Date:** 2026-08-07
**Context:** API Framework Selection

## Context and Problem Statement
The backend requires an HTTP framework to handle incoming Razorpay webhooks, authenticate internal dashboard requests, and orchestrate the dependency injection for our isolated domain services. A simple Express or Fastify setup often devolves into "spaghetti code" without strict architectural boundaries.

## Decision
We will use **NestJS** as the core API framework.

## Rationale
1. **Built-in Dependency Injection (DI):** NestJS's DI container is enterprise-grade. It allows us to easily bind abstract interfaces (`libs/contracts`) to concrete Prisma repositories (`libs/persistence`) at runtime. This fulfills the inversion of control required by our Domain-Driven Design (ADR-007) and makes unit testing trivial by injecting mocks.
2. **Modular Architecture:** NestJS enforces a modular structure out of the box, perfectly complementing our monorepo setup.
3. **Robust Request Lifecycle:** We heavily utilize NestJS's request lifecycle tools:
   - **Pipes:** `ValidationPipe` combined with `class-validator` strictly enforces payload integrity at the boundary.
   - **Exception Filters:** Our global `HttpExceptionFilter` intercepts all errors and forces them into our standardized JSON error model, preventing stack trace leakage.
   - **Middleware:** Easy injection of correlation IDs for distributed tracing.

## Consequences
- NestJS has a steeper learning curve and adds more boilerplate (Modules, Controllers, Providers) compared to raw Express.
- It relies heavily on TypeScript decorators and reflection, necessitating specific compiler options (`experimentalDecorators`, `emitDecoratorMetadata`).
- The framework is restricted strictly to the delivery layer (`apps/api`); it is explicitly banned from being imported into the domain layer.
