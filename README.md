# Razorpay AI Buildathon — Track 03: AI Revenue Recovery

## Prerequisites
- Node.js 22 LTS
- pnpm (corepack enabled)

## Installation
```bash
make install
# or
pnpm install
```

## Workspace Commands
- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages
- `pnpm lint` - Run ESLint
- `pnpm format` - Run Prettier
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm test` - Run all tests
- `make verify` - Run full verification suite (install, lint, typecheck, test)

## Repository Packages Overview
- `apps/api` - NestJS Backend
- `apps/worker` - Background Processor
- `apps/frontend` - React Dashboard
- `libs/domain` - Shared domain logic & types
- `libs/contracts` - API contracts/interfaces
- `libs/config` - Shared configuration
- `libs/observability` - Logging and metrics
- `libs/evaluation` - Evaluation framework
- `libs/llm` - AI integration abstractions
- `libs/utils` - Shared utilities

## Running the API Locally
`pnpm --filter @rr/api dev`

Required environment variables:
- `DATABASE_URL` (in `.env`)
