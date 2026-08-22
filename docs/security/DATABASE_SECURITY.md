# Database Security Guidelines

## 1. Secrets Management
- `DATABASE_URL` must never be hardcoded or checked into Git.
- Use explicit user roles. Do not run application queries as the PostgreSQL superuser in production.
- Example template formats are in `infra/env/demo.env.example`.

## 2. Network Isolation
- The database should only be accessible to the backend API and Worker processes.
- Do not expose port 5432 to the public internet.
- In Docker Compose (demo), ports are bound to `127.0.0.1:5433` to prevent external network traversal.

## 3. Data Safety & Migrations
- Schema changes are managed via Prisma Migrations (`prisma migrate deploy`).
- `prisma db push` is strictly forbidden in CI, test, and production environments as it can destructively alter tables.
- All destructive migrations must be manually reviewed.

## 4. PII and Sensitive Data
- Customer emails, phone numbers, and identifying metadata must be encrypted at rest if the database volume is not already encrypted.
- Audit logs must not contain plain-text raw card data or unmasked payment tokens.
