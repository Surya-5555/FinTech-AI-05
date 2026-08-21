# Persistence Architecture

- **PostgreSQL**: Selected as the primary transactional store due to its robustness and support for JSONB (though we treat json as text here for generic fallback) and strict consistency.
- **Prisma**: Serves as the ORM and migration tool.
- **Transaction Boundaries**: Domain actions like state transitions map to a single database transaction.
- **Idempotency**: Implemented using unique constraints on idempotency keys across execution attempts.
- **Optimistic Concurrency**: Enforced on `RevenueCase` via a `version` column.
- **Audit Logging**: Strictly append-only.
- **Money Representation**: `amountMinor` as BIGINT to prevent floating point imprecision.
