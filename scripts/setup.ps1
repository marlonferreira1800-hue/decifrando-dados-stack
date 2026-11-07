# Prepara o ambiente local: .venv + dependências Python, npm install e .env.
# Uso: powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

if (-not (Test-Path (Join-Path $root ".env"))) {
    Copy-Item (Join-Path $root ".env.example") (Join-Path $root ".env")
    Write-Host ".env criado a partir do .env.example — preencha as chaves." -ForegroundColor Yellow
}

Push-Location $backend
if (-not (Test-Path ".venv")) {
    Write-Host "Criando .venv..." -ForegroundColor Cyan
    python -m venv .venv
}
Write-Host "Instalando dependências Python..." -ForegroundColor Cyan
& .\.venv\Scripts\python.exe -m pip install -q --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -q -r requirements.txt
Pop-Location

if (Test-Path $frontend) {
    Push-Location $frontend
    Write-Host "Instalando dependências do frontend..." -ForegroundColor Cyan
    npm install --silent --no-fund --no-audit
    Pop-Location
}

Write-Host "Setup concluído! Rode: powershell -File scripts\dev.ps1" -ForegroundColor Green
