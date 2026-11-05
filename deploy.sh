#!/usr/bin/env bash
set -e

echo "========================================================"
echo "    DISCFINANCI - DEPLOY & INSTALAÇÃO NO SERVIDOR"
echo "========================================================"

# Diretório base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_DIR"

# 1. Configurar Backend Python
echo -e "\n[1/3] Configurando Backend (Python 3 venv)..."
cd "$BASE_DIR/backend"
if [ ! -d "venv" ]; then
    echo "Criando ambiente virtual python venv..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# 2. Configurar Frontend e Build de Produção
echo -e "\n[2/3] Instalando dependências e compilando Frontend..."
cd "$BASE_DIR/frontend"
npm install
npm run build

# 3. Iniciar / Atualizar no PM2
echo -e "\n[3/3] Iniciando serviços no PM2..."
cd "$BASE_DIR"
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "========================================================"
echo "          DISCFINANCI IMPLANTADO COM SUCESSO!"
echo "========================================================"
echo "  • Backend API:  http://127.0.0.1:8001"
echo "  • Frontend Web: http://127.0.0.1:3001"
echo ""
echo "  Configuração no Cloudflare Tunnel:"
echo "  Aponte seu domínio/subdomínio para:"
echo "  Service: HTTP -> localhost:3001"
echo "========================================================"

