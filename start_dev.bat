@echo off
cd /d "%~dp0"
echo ================================================================
echo            INICIANDO DISCFINANCI (FRONTEND + BACKEND)
echo ================================================================

start "DiscFinanci - Backend" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"
start "DiscFinanci - Frontend" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"

timeout /t 3 /nobreak >nul
start http://localhost:3001
