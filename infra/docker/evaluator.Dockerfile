# syntax=docker/dockerfile:1
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates wget && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app

# ----- Dependencies Stage -----
FROM base AS deps
COPY pnpm-lock.yaml ./
COPY package.json pnpm-workspace.yaml ./

# Copy all packages (simplest for evaluator since it might touch multiple libs)
COPY apps/ ./apps/
COPY libs/ ./libs/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=true pnpm install --frozen-lockfile

# ----- Build Stage -----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/libs ./libs
COPY . .

RUN pnpm --filter @rr/persistence exec prisma generate

# ----- Evaluator Run Stage -----
# We just use the build stage image as the runtime for evaluator
# since it's a one-shot task running via TS-node or similar.
FROM build AS evaluator

# Default command will be overridden in compose.yaml depending on task
ENTRYPOINT ["docker-entrypoint-evaluator.sh"]
