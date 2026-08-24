# Persistence Architecture

## Overview
The persistence layer abstracts all database I/O behind strict interfaces, ensuring the domain and application layers remain ignorant of the underlying storage technology. We utilize PostgreSQL as the relational engine, accessed via Prisma ORM for type-safe queries and schema migrations.

## Repository Pattern Implementation

We strictly adhere to the Repository Pattern to decouple business logic from data access.
- **Contracts (`libs/contracts/src`):** Define the shapes of the repositories (e.g., `IRevenueCaseRepository`). These interfaces belong to the application core.
- **Prisma Repositories (`libs/persistence/src/repositories/prisma`):** The concrete implementations of those contracts. They inject the `PrismaClient` and perform the actual SQL queries.
- **Dependency Injection:** The NestJS IoC container binds the concrete Prisma repositories to the abstract contract tokens at startup. This enables seamless mocking during unit tests.

## Transaction Management & Consistency

Financial systems require ACID guarantees. 
- **The Outbox Transaction:** When a state transition occurs (e.g., a case is marked as `PLANNED`), the repository saves the updated `RevenueCase` AND inserts a new `OutboxEvent` in a **single database transaction**. This guarantees that if the database crashes, we never end up with updated state but unsent messages, or sent messages but rolled-back state.
- **Prisma Interactive Transactions:** We utilize Prisma's `$transaction` API to wrap these multi-table operations.

## Idempotency and Race Conditions
- **Unique Constraints:** The `externalEventId` on the `RevenueEvent` table is unique, allowing the database itself to enforce idempotency on ingestion.
- **Optimistic Concurrency Control (OCC):** The `RevenueCase` table includes a `@updatedAt` version field. When updating a case, the repository includes a `WHERE version = expected_version` clause. If another worker modified the row concurrently, the update fails (0 rows affected), the transaction aborts, and the worker safely retries.
