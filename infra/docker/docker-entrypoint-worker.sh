#!/bin/sh
set -e

echo "Starting Worker..."
cd /app
exec node apps/worker/dist/main.js
