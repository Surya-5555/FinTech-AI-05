# Prisma Migration Workflow

## Overview
As of Phase 6.1, we have transitioned from `prisma db push` to `prisma migrate`. All schema changes must now be tracked via migration files.

## Local Development Workflow
When you make a change to `libs/persistence/prisma/schema.prisma`, you must create a migration:

```bash
pnpm --filter @rr/persistence run db:migrate --name <descriptive_name>
```

This will:
1. Compare your schema against the local database.
2. Generate a new `.sql` migration file in `prisma/migrations`.
3. Apply the migration to your local database.
4. Regenerate the Prisma Client.

## Handling the Init Baseline
Because we started with `db push` and retroactively added migrations, your local database may already have all tables but no `_prisma_migrations` history.

If you get errors about tables already existing when trying to migrate, you must **resolve the baseline**:

```bash
pnpm --filter @rr/persistence exec prisma migrate resolve --applied 00000000000000_init_baseline
```
This tells Prisma: "Assume this migration is already applied, don't run the SQL."

## Deployment
In CI/CD or Docker Compose (Demo mode), we only deploy migrations. We never create them.

```bash
pnpm --filter @rr/persistence run db:deploy
```
This applies pending migrations without prompting.

## Rules
- **NEVER** run `prisma db push`. It will corrupt the migration history.
- **NEVER** edit a migration `.sql` file after it has been merged to `main`.
