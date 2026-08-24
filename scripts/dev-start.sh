#!/usr/bin/env bash
# ============================================================
# dev-start.sh — Local Development Startup Script (Linux/Mac)
# ============================================================
# Starts all services for the Razorpay AI Revenue Recovery system
# using a tmux session with named windows per service.
# If tmux is not available, falls back to background processes
# with log files written to logs/dev/.
#
# Usage:
#   cd /path/to/RazorPay-Buildathon
#   chmod +x scripts/dev-start.sh
#   ./scripts/dev-start.sh
#
# Prerequisites:
#   - Docker running (for Postgres + Redis infra)
#   - pnpm installed globally
#   - Python venv created at apps/ml-pipeline/venv
#   - tmux (optional but recommended: sudo apt install tmux)
# ============================================================

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/logs/dev"
SESSION="rr-dev"

echo ""
echo "========================================"
echo "  Razorpay AI Revenue Recovery — Dev    "
echo "========================================"
echo ""

# ── Create log directory ────────────────────────────────────
mkdir -p "$LOG_DIR"

# ── Check if tmux is available ──────────────────────────────
if command -v tmux &>/dev/null; then
  USE_TMUX=true
else
  USE_TMUX=false
  echo "⚠  tmux not found — falling back to background processes."
  echo "   Logs will be written to: $LOG_DIR/"
  echo ""
fi

# ── Helper: run in tmux window or background ────────────────
run_service() {
  local name="$1"
  local dir="$2"
  local cmd="$3"

  if [ "$USE_TMUX" = true ]; then
    tmux new-window -t "$SESSION" -n "$name"
    tmux send-keys -t "$SESSION:$name" "cd '$dir' && $cmd" Enter
  else
    echo "[START] $name → log: $LOG_DIR/$name.log"
    (cd "$dir" && eval "$cmd" > "$LOG_DIR/$name.log" 2>&1) &
    echo $! > "$LOG_DIR/$name.pid"
  fi
}

# ── Create or attach tmux session ───────────────────────────
if [ "$USE_TMUX" = true ]; then
  # Kill existing session if present to start fresh
  tmux kill-session -t "$SESSION" 2>/dev/null || true
  tmux new-session -d -s "$SESSION" -n "INFRA"
fi

# ── 1. Infra: Postgres + Redis via Docker Compose ──────────
echo "[1/5] Starting infrastructure (Postgres + Redis)..."
if [ "$USE_TMUX" = true ]; then
  tmux send-keys -t "$SESSION:INFRA" \
    "cd '$ROOT' && docker compose -f infra/compose/compose.yaml up" Enter
else
  (cd "$ROOT" && docker compose -f infra/compose/compose.yaml up -d \
    > "$LOG_DIR/infra.log" 2>&1)
  echo "      Docker infra started (detached)."
fi

sleep 5   # Give Docker a moment to spin up

# ── 2. ML Pipeline (FastAPI on port 8000) ──────────────────
echo "[2/5] Starting ML Pipeline (port 8000)..."
run_service "ML" \
  "$ROOT/apps/ml-pipeline/src" \
  "source ../venv/bin/activate && python server.py"

# ── 3. API Server (NestJS on port 3000) ────────────────────
echo "[3/5] Starting API Server (port 3000)..."
run_service "API" \
  "$ROOT" \
  "pnpm --filter @rr/api dev"

# ── 4. Background Worker (BullMQ processor) ────────────────
echo "[4/5] Starting Background Worker..."
run_service "WORKER" \
  "$ROOT" \
  "pnpm --filter @rr/worker dev"

# ── 5. Frontend Dashboard (Vite on port 5173) ──────────────
echo "[5/5] Starting Frontend Dashboard (port 5173)..."
run_service "FRONTEND" \
  "$ROOT" \
  "pnpm --filter @rr/frontend dev"

echo ""
echo "========================================"
echo "  All services are starting!            "
echo "========================================"
echo ""
echo "  Dashboard   → http://localhost:5173   "
echo "  API         → http://localhost:3000   "
echo "  ML Pipeline → http://localhost:8000   "
echo ""

if [ "$USE_TMUX" = true ]; then
  echo "  Attaching to tmux session '$SESSION'..."
  echo "  Switch windows: Ctrl+B then 0-4"
  echo "  Detach session: Ctrl+B then D"
  echo ""
  tmux select-window -t "$SESSION:INFRA"
  tmux attach-session -t "$SESSION"
else
  echo "  Services running in background."
  echo "  Logs: $LOG_DIR/"
  echo ""
  echo "  To stop all services, run:"
  echo "    ./scripts/dev-stop.sh"
  echo ""
  # Write a stop script alongside
  cat > "$ROOT/scripts/dev-stop.sh" << 'STOP'
#!/usr/bin/env bash
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/logs/dev"
echo "Stopping all dev services..."
for pidfile in "$LOG_DIR"/*.pid; do
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    name=$(basename "$pidfile" .pid)
    kill "$pid" 2>/dev/null && echo "  Stopped $name (PID $pid)" || echo "  $name already stopped"
    rm -f "$pidfile"
  fi
done
docker compose -f "$ROOT/infra/compose/compose.yaml" down
echo "Done."
STOP
  chmod +x "$ROOT/scripts/dev-stop.sh"
fi
