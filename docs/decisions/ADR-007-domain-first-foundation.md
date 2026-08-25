# ADR-007: Tactical Domain-Driven Design (DDD) Foundation

**Status:** Accepted
**Date:** 2026-08-05
**Context:** Software Architecture

## Context and Problem Statement
Financial software is complex. If business rules (like checking cooldown periods, capping attempt limits, or applying recovery strategies) are mixed directly into HTTP controllers or ORM queries, the system becomes fragile, difficult to test, and prone to leaking state. We need a rigid architectural pattern to protect the core business logic.

## Decision
We will enforce **Tactical Domain-Driven Design (DDD)** principles, specifically isolating the `libs/domain` package from all external frameworks.

## Rationale
1. **Framework Agnosticism:** The `libs/domain` package is pure TypeScript. It contains absolutely no dependencies on NestJS (`@nestjs/core`), Prisma (`@prisma/client`), or Express. This ensures that the business logic can be unit-tested instantly without a database or HTTP server.
2. **Aggregate Roots:** The `RevenueCase` acts as our Aggregate Root. It encapsulates the state machine. Transitions (e.g., `markAsPlanned`) can only be performed via methods on this class, which internally validate all invariants before altering state.
3. **Anemic vs Rich Models:** We explicitly reject anemic data models. Prisma models are used strictly as data transfer objects for the database. Our domain entities contain both the data and the rich behaviors that manipulate it.
4. **Data Mappers:** The persistence layer uses explicit Mapper classes to translate between Prisma database records and pure Domain Entities, ensuring the domain layer remains untainted by database-specific structures.

## Consequences
- Increased boilerplate: Every entity requires a Domain class, a Prisma model, and a Mapper to translate between them.
- Forces developers to think carefully about the boundaries of aggregates and transactions, which slows initial development but drastically reduces production bugs.
