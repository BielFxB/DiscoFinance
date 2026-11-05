# Script PowerShell para iniciar Backend e Frontend simultaneamente
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "            INICIANDO DISCFINANCI (BACKEND + FRONTEND)          " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Backend:  http://127.0.0.1:8001 (Docs: http://127.0.0.1:8001/docs)" -ForegroundColor Yellow
Write-Host " Frontend: http://127.0.0.1:3001" -ForegroundColor Green
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# Iniciar Backend FastAPI
Write-Host "[1/2] Iniciando Backend FastAPI (Porta 8001)..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .\venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"

# Iniciar Frontend React/Vite
Write-Host "[2/2] Iniciando Frontend React/Vite (Porta 3001)..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

# Aguardar e abrir navegador
Start-Sleep -Seconds 3
Start-Process "http://localhost:3001"

Write-Host "Servicos iniciados em janelas separadas!" -ForegroundColor Green

