@echo off
chcp 65001 >nul
title Decifrando Dados — Portal & Estudio Editorial
cd /d "%~dp0"

echo ================================================================
echo   DECIFRANDO DADOS — INICIANDO PORTAL PUBLICO E PAINEL ADMIN
echo ================================================================

start "Decifrando Dados - API FastAPI" /D "%~dp0backend" "%~dp0backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
start "Decifrando Dados - Frontend React" /D "%~dp0frontend" cmd /k "npx vite --host 127.0.0.1 --port 5173"

timeout /t 3 >nul
start http://localhost:5173
