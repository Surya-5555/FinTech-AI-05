# dev-start.ps1 - Local Development Startup Script (Windows)
# Usage: .\scripts\dev-start.ps1 from the project root

$ROOT = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Razorpay AI Revenue Recovery - Dev    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Infra: Postgres + Redis
Write-Host "[1/5] Starting infrastructure (Postgres + Redis)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT'; docker compose -f infra/compose/compose.yaml up"

Write-Host "      Waiting 5s for Docker to spin up..."
Start-Sleep -Seconds 5

# 2. ML Pipeline on port 8000
Write-Host "[2/5] Starting ML Pipeline (port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT\apps\ml-pipeline\src'; ..\venv\Scripts\Activate.ps1; python server.py"

# 3. API Server on port 3000
Write-Host "[3/5] Starting API Server (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT'; pnpm --filter @rr/api dev"

# 4. Background Worker
Write-Host "[4/5] Starting Background Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT'; pnpm --filter @rr/worker dev"

# 5. Frontend on port 5173
Write-Host "[5/5] Starting Frontend Dashboard (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT'; pnpm --filter @rr/frontend dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services started!                 " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Dashboard   -> http://localhost:5173" -ForegroundColor White
Write-Host "  API         -> http://localhost:3000" -ForegroundColor White
Write-Host "  ML Pipeline -> http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "  Wait about 15s for all services to be ready." -ForegroundColor DarkGray
Write-Host ""
