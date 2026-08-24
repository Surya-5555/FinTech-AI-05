# ADR-008: Prisma ORM for Persistence

**Status:** Accepted
**Date:** 2026-08-06
**Context:** Database Interaction

## Context and Problem Statement
While PostgreSQL is our chosen database (ADR-002), writing raw SQL for complex, multi-table financial queries can lead to SQL injection vulnerabilities, typing mismatches, and difficult schema migrations. We need an ORM that provides strict type safety, predictable performance, and reliable migration management.

## Decision
We will use **Prisma ORM** as the exclusive method for interacting with the PostgreSQL database.

## Rationale
1. **End-to-End Type Safety:** Prisma automatically generates strict TypeScript types directly from the database schema. This eliminates the risk of retrieving a string from the database and accidentally treating it as an integer in the application layer, a critical guarantee for the `amountMinor` fields in our financial calculations.
2. **Migration Management:** Prisma Migrate provides a deterministic, version-controlled way to manage database schema evolution. This is essential for CI/CD pipelines where the test database must be instantiated from scratch perfectly every time.
3. **Interactive Transactions:** Prisma's `$transaction` API elegantly handles the multi-table operations required by our Transactional Outbox pattern, ensuring that updating the `RevenueCase` and inserting an `OutboxEvent` are committed atomically.
4. **Developer Ergonomics:** Prisma's intuitive schema definition language (`schema.prisma`) acts as a central, readable source of truth for the entire persistence architecture.

## Consequences
- Prisma does not map seamlessly to rich DDD Domain entities natively, requiring us to build explicit mapping layers (as decided in ADR-007).
- Complex aggregate queries might require falling back to `$queryRaw` if Prisma's query engine produces unoptimized SQL.
