# ADR 008: PostgreSQL and Prisma Persistence

## Context
We need a stable database to persist revenue cases, plans, and audit logs while honoring strict money safety and concurrency rules.

## Decision
- We use PostgreSQL for strong transactional guarantees.
- Prisma will manage the schema and generated query client.
- The Domain layer will remain completely oblivious to Prisma (`libs/domain` cannot import `@prisma/client`). Mappers in `libs/persistence` will translate.
- All monetary values are strictly saved as BIGINT minor units. No floats.
- Audit logs are append-only. No deletion API is exposed.
