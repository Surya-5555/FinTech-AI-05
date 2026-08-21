#!/bin/sh
set -e

# Wait for API to be ready if needed, but typically evaluation runs standalone
# and just needs DB/Redis.

echo "Running evaluator task: $1"
cd /app

if [ "$1" = "smoke" ]; then
  exec pnpm evaluate-smoke
elif [ "$1" = "failure" ]; then
  exec pnpm failure-demo
else
  echo "Unknown evaluator task. Running bash."
  exec /bin/sh
fi
