#!/bin/bash
# Script para iniciar backend e frontend simultaneamente no Linux
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "================================================================"
echo "          INICIANDO DISCFINANCI NO LINUX (DEV)                 "
echo "================================================================"
echo "Backend:  http://127.0.0.1:8001"
echo "Frontend: http://127.0.0.1:3001"
echo "================================================================"

# Inicia backend
cd "$DIR/backend"
if [ -d "venv" ]; then
    ./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload &
else
    python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload &
fi
BACKEND_PID=$!

# Inicia frontend
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# Tratamento para encerrar ambos ao pressionar Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait

