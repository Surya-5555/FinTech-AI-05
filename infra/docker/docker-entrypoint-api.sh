#!/bin/sh
set -e

# Wait for DB to be ready (if pg_isready is available)
# Note: In our setup we rely on compose depends_on: condition: service_healthy
# But this script handles Prisma migration deployments.

echo "Running prisma migrations..."
cd /app/libs/persistence
npx prisma migrate deploy

# We can add an idempotent DEMO_SEED check here.
if [ "$DEMO_SEED" = "true" ]; then
  echo "DEMO_SEED is true, but skipping since seed script is not yet provided."
fi

echo "Starting API..."
cd /app
exec node apps/api/dist/main.js
