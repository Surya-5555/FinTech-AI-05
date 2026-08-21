# Persistence Layer

This library handles all interactions with PostgreSQL via Prisma.
Domain models and contracts are strictly separated from persistence details. Prisma models are mapped to pure domain entities inside `libs/persistence/src/mappers/`.
