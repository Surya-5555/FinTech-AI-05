# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# ----- Dependencies Stage -----
COPY pnpm-lock.yaml ./
COPY package.json pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
# We also need any libs if frontend depends on them (e.g., domain/contracts for types)
# Assuming frontend only depends on itself or we copy all
COPY libs/ ./libs/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ----- Build Stage -----
COPY apps/frontend ./apps/frontend

# Build frontend
# We can inject API url via build args if we wanted, but in a local compose demo
# the default /api or localhost:3000 is used depending on how Vite proxies.
# By default, Vite proxy handles API if served via Vite. But we are building static.
# So we need to provide VITE_API_BASE_URL
ARG VITE_API_BASE_URL="http://localhost:3000"
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm --filter @rr/frontend build

# ----- Production Stage (Nginx) -----
FROM nginx:alpine AS production

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

# Copy custom Nginx configuration if needed
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
