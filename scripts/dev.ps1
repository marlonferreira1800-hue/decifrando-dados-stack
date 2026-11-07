# Inicia o ambiente de desenvolvimento local no Windows (abre uma janela por serviço).
# Uso: powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$activate = Join-Path $backend ".venv\Scripts\Activate.ps1"

if (-not (Test-Path $activate)) {
    Write-Host "Ambiente Python não encontrado. Rodando setup..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "setup.ps1")
}

# 1) Redis via Docker (reaproveita o container se já existir)
$redisName = "redis-decifrando-dados"
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $existe = docker ps -a --filter "name=^$redisName$" --format "{{.Names}}"
    if ($existe) { docker start $redisName | Out-Null }
    else { docker run -d --name $redisName -p 6379:6379 redis:7-alpine | Out-Null }
    Write-Host "Redis rodando (container $redisName)" -ForegroundColor Green
} else {
    Write-Host "Docker não encontrado: inicie um Redis em localhost:6379 manualmente." -ForegroundColor Yellow
}

function Start-Janela($titulo, $pasta, $comando) {
    $script = "`$Host.UI.RawUI.WindowTitle = '$titulo'; Set-Location '$pasta'; $comando"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $script
}

# 2) API FastAPI com auto-reload
Start-Janela "API (uvicorn)" $backend "& '$activate'; uvicorn app.main:app --reload --port 8000"
# 3) Worker Celery (no Windows é obrigatório --pool=solo)
Start-Janela "Worker (celery)" $backend "& '$activate'; celery -A app.worker.celery_app worker --pool=solo --loglevel=info"
# 4) Frontend Vite
if (Test-Path $frontend) {
    Start-Janela "Frontend (vite)" $frontend "npm run dev"
}

Write-Host ""
Write-Host "API:     http://localhost:8000/docs" -ForegroundColor Cyan
if (Test-Path $frontend) { Write-Host "Painel:  http://localhost:5173" -ForegroundColor Cyan }
