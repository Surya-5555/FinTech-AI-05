# API Foundation

## Overview
The API layer of the Razorpay AI Revenue Recovery system is built strictly as an **HTTP delivery mechanism** on top of the NestJS framework. It adheres to strict separation of concerns, ensuring that **no business logic, state mutation rules, or financial intelligence** leaks into the controller layer. The API serves solely to validate incoming HTTP payloads, authenticate requests, and dispatch commands to the internal domain boundary.

## Core Principles

### 1. Strict Validation Boundaries (Zod & Class-Validator)
All incoming payloads cross a rigid validation boundary immediately upon ingress. We utilize strict TypeScript Data Transfer Objects (DTOs) annotated with class-validator decorators, combined with a globally bound `ValidationPipe`.
- Unknown properties are stripped automatically (`whitelist: true`, `forbidNonWhitelisted: true`).
- Malformed payloads (e.g., missing webhook signatures, invalid amounts) are rejected with deterministic HTTP 400 structures before ever touching the domain logic.

### 2. Controllers as Thin Dispatchers
Controllers do nothing more than map HTTP verbs and paths to specific domain use cases or query handlers. 
- They parse headers (e.g., `Idempotency-Key`).
- They delegate processing to injected services.
- They map domain-layer `Result` objects or Exceptions into standard HTTP responses.

### 3. Idempotency at the Ingress
Because webhooks from financial partners (like Razorpay) are subject to at-least-once delivery semantics, the API Foundation explicitly inspects and maps unique identifiers (like `externalEventId` and webhook signatures) to enforce strict idempotency at the moment of ingress. A duplicate webhook returns a HTTP 200 without executing internal workflows twice.

### 4. Dependency Injection & Isolation
The API controllers depend entirely on interfaces (ports) defined in `libs/contracts`, rather than concrete implementations (adapters). NestJS's robust DI container wires the Prisma repositories, BullMQ queues, and LLM clients to these interfaces at runtime. This ensures the API layer can be unit tested without requiring a live database or Redis connection.
