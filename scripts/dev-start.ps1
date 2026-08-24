# ============================================================
# dev-start.ps1 — Local Development Startup Script (Windows)
# ============================================================
# Starts all services for the Razorpay AI Revenue Recovery system
# in separate PowerShell windows so logs stay isolated.
#
# Usage:
#   cd D:\projects\RazorPay-Buildathon
#   .\scripts\dev-start.ps1
#
# Prerequisites:
#   - Docker Desktop running (for Postgres + Redis infra)
#   - pnpm installed globally
#   - Python venv created at apps/ml-pipeline/venv
# ============================================================

$ROOT = Split-Path -Parent $PSScriptRoot
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Razorpay AI Revenue Recovery — Dev    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Infra: Postgres + Redis via Docker Compose ──────────
Write-Host "[1/5] Starting infrastructure (Postgres + Redis)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$ROOT'; Write-Host '[INFRA] Starting Docker infra...' -ForegroundColor Cyan; docker compose -f infra/compose/compose.yaml up"
) -WindowStyle Normal

Start-Sleep -Seconds 5   # Give Docker a moment to spin up

# ── 2. ML Pipeline (FastAPI on port 8000) ──────────────────
Write-Host "[2/5] Starting ML Pipeline (port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$ROOT\apps\ml-pipeline\src'; Write-Host '[ML] Activating venv and starting FastAPI...' -ForegroundColor Green; ..\venv\Scripts\Activate.ps1; python server.py"
) -WindowStyle Normal

# ── 3. API Server (NestJS on port 3000) ────────────────────
Write-Host "[3/5] Starting API Server (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$ROOT'; Write-Host '[API] Starting NestJS API...' -ForegroundColor Green; pnpm --filter @rr/api dev"
) -WindowStyle Normal

# ── 4. Background Worker (BullMQ processor) ────────────────
Write-Host "[4/5] Starting Background Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$ROOT'; Write-Host '[WORKER] Starting BullMQ Worker...' -ForegroundColor Green; pnpm --filter @rr/worker dev"
) -WindowStyle Normal

# ── 5. Frontend Dashboard (Vite on port 5173) ──────────────
Write-Host "[5/5] Starting Frontend Dashboard (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$ROOT'; Write-Host '[FRONTEND] Starting Vite dev server...' -ForegroundColor Green; pnpm --filter @rr/frontend dev"
) -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services are starting!            " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Dashboard   -> http://localhost:5173   " -ForegroundColor White
Write-Host "  API         -> http://localhost:3000   " -ForegroundColor White
Write-Host "  ML Pipeline -> http://localhost:8000   " -ForegroundColor White
Write-Host ""
Write-Host "  Wait ~15s for all services to be ready." -ForegroundColor DarkGray
Write-Host ""
