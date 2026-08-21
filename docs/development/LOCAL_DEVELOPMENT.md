# Local Development Guide

## Node Environment (Bare Metal)

For rapid development, you can run the entire stack on your host machine without Docker.

1. Ensure Postgres and Redis are running locally.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy `.env.example` to `.env` and fill in your local Postgres/Redis URLs.
4. Run migrations:
   ```bash
   pnpm --filter @rr/persistence exec prisma migrate dev
   ```
5. Start development servers concurrently:
   ```bash
   pnpm dev
   ```

## Docker Environment

If you prefer to develop with a containerized infrastructure, you can use the Docker Compose setup. See `DOCKER_DEMO.md` for full instructions.

### Useful Commands

- `make verify` - Runs linting, typechecking, and tests.
- `pnpm test` - Runs vitest across all workspaces.
- `pnpm build` - Builds all applications and libraries into `dist/` folders.
