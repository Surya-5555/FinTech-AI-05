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
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/frontend/package.json ./apps/frontend/
COPY libs/config/package.json ./libs/config/
COPY libs/contracts/package.json ./libs/contracts/
COPY libs/domain/package.json ./libs/domain/
COPY libs/evaluation/package.json ./libs/evaluation/
COPY libs/llm/package.json ./libs/llm/
COPY libs/observability/package.json ./libs/observability/
COPY libs/persistence/package.json ./libs/persistence/
COPY libs/utils/package.json ./libs/utils/

# Install dependencies (frozen lockfile)
RUN pnpm install --frozen-lockfile

# ----- Build Stage -----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/libs/config/node_modules ./libs/config/node_modules
COPY --from=deps /app/libs/contracts/node_modules ./libs/contracts/node_modules
COPY --from=deps /app/libs/domain/node_modules ./libs/domain/node_modules
COPY --from=deps /app/libs/evaluation/node_modules ./libs/evaluation/node_modules
COPY --from=deps /app/libs/llm/node_modules ./libs/llm/node_modules
COPY --from=deps /app/libs/observability/node_modules ./libs/observability/node_modules
COPY --from=deps /app/libs/persistence/node_modules ./libs/persistence/node_modules
COPY --from=deps /app/libs/utils/node_modules ./libs/utils/node_modules
# Copy source
COPY . .
# Build Prisma Client
RUN pnpm --filter @rr/persistence exec prisma generate
# Build the API and its dependencies
RUN pnpm --filter @rr/api build

# ----- Prune Stage (Production Dependencies Only) -----
FROM base AS prune
COPY --from=build /app /app
WORKDIR /app
RUN pnpm install --prod --frozen-lockfile

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
COPY --chown=nestjs:nodejs infra/docker/docker-entrypoint-api.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint-api.sh

USER nestjs

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint-api.sh"]
