# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# ----- Dependencies Stage -----
FROM base AS deps
COPY pnpm-lock.yaml ./
COPY package.json pnpm-workspace.yaml ./
# Copy workspace packages package.json files
COPY apps/worker/package.json ./apps/worker/
COPY libs/config/package.json ./libs/config/
COPY libs/contracts/package.json ./libs/contracts/
COPY libs/domain/package.json ./libs/domain/
COPY libs/llm/package.json ./libs/llm/
COPY libs/observability/package.json ./libs/observability/
COPY libs/persistence/package.json ./libs/persistence/
COPY libs/utils/package.json ./libs/utils/

RUN pnpm install --frozen-lockfile

# ----- Build Stage -----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/libs ./libs
# Copy source
COPY . .
# Build Prisma Client
RUN pnpm --filter @rr/persistence exec prisma generate
# Build the worker and its dependencies
RUN pnpm --filter @rr/worker build

# ----- Prune Stage (Production Dependencies Only) -----
FROM base AS prune
COPY --from=build /app /app
RUN CI=true pnpm install --prod --frozen-lockfile
RUN pnpm --filter @rr/persistence exec prisma generate

# ----- Production Stage -----
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy pruned workspace
COPY --from=prune --chown=nestjs:nodejs /app /app

# Copy entrypoint script
COPY --chown=nestjs:nodejs infra/docker/docker-entrypoint-worker.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint-worker.sh

USER nestjs

ENTRYPOINT ["docker-entrypoint-worker.sh"]
