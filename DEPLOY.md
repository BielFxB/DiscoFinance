# 🚀 Guia de Hospedagem no Servidor (Linux + PM2 + Cloudflare Tunnel)

Este guia foi desenhado sob medida para o seu servidor Linux (`frdata@frdata:~`), aproveitando a infraestrutura existente (PM2 e Cloudflare Tunnel) e preservando os serviços do projeto **GamyCoins** (portas 3000 e 8000).

---

## 📌 Visão Geral da Arquitetura no Servidor

| Serviço | Porta Interna | Descrição |
| :--- | :--- | :--- |
| **GamyCoins (Atual)** | `3000` / `8000` | Intocados. Continuam rodando normalmente. |
| **DiscFinanci API** | `8001` | FastAPI + Bot Discord assíncrono (Python 3.10+). |
| **DiscFinanci Web** | `3001` | Servidor Node de produção leve (`prod_server.js`). Serve o React compilado e faz proxy reverso de `/api` para a porta 8001. |
| **Cloudflare Tunnel** | `localhost:3001` | **Apenas 1 rota necessária!** O subdomínio HTTPS aponta para a porta 3001 e acessa tanto o site quanto a API sem erros de CORS. |

Consumo total estimado: **~75 MB de memória RAM** e **0% CPU em repouso**.

---

## 🛠️ Passo 1: Transferir o Projeto para o Servidor

Você pode clonar via Git ou enviar via SCP/FileZilla do seu computador:

```bash
# Exemplo via SCP a partir do seu PC (PowerShell ou Git Bash):
scp -r c:\Users\Gabriel\Documents\DiscFinanci frdata@ip-do-servidor:~/DiscFinanci
```

Ou no servidor:
```bash
cd ~
git clone <URL_DO_REPOSITORIO> DiscFinanci
cd DiscFinanci
```

---

## ⚙️ Passo 2: Configurar o Arquivo de Variáveis (.env)

Certifique-se de que o arquivo `backend/.env` existe e contém as credenciais do Supabase e do Bot do Discord:

```bash
cd ~/DiscFinanci/backend
nano .env
```

Conteúdo esperado:
```env
PORT=8001
HOST=127.0.0.1
CORS_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
JWT_SECRET=seu-jwt-secret-aqui
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=30
SUPABASE_URL=https://kpvujjcdredvzqqjrurz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
DISCORD_BOT_TOKEN=seu-token-do-bot-discord
```

---

## 🚀 Passo 3: Executar a Instalação Automatizada

Na raiz da pasta `DiscFinanci`, basta executar o script `deploy.sh`:

```bash
cd ~/DiscFinanci
chmod +x deploy.sh
./deploy.sh
```

O script fará sozinho:
1. Criação do ambiente virtual `venv` do Python e instalação das dependências.
2. Instalação das dependências do Node e build de produção do React (`dist/`).
3. Inicialização dos dois serviços no PM2 (`discfinanci-api` e `discfinanci-web`).
4. Execução do `pm2 save` para garantir persistência após reinicialização do servidor.

---

## 🌐 Passo 4: Configurar no Cloudflare Tunnel (Zero Trust)

No painel da Cloudflare:
1. Acesse **Zero Trust** -> **Networks** -> **Tunnels**.
2. Clique no seu túnel ativo e vá em **Configure**.
3. Na aba **Public Hostname**, clique em **Add a public hostname**:
   - **Subdomain:** `financas` (ou outro nome desejado)
   - **Domain:** Selecione seu domínio (ex: `seusite.com`)
   - **Service Type:** `HTTP`
   - **URL:** `localhost:3001`
4. Clique em **Save hostname**.

> 🎉 **Pronto!** Em poucos segundos, seu sistema estará acessível em `https://financas.seusite.com` com HTTPS automático, bot do Discord online e funcionando no celular e no computador.

---

## 📋 Comandos Úteis do PM2

```bash
# Ver status de todos os serviços (incluindo GamyCoins e DiscFinanci)
pm2 status

# Ver logs em tempo real
pm2 logs discfinanci-api
pm2 logs discfinanci-web

# Reiniciar os serviços do DiscFinanci
pm2 restart discfinanci-api
pm2 restart discfinanci-web

# Parar temporariamente
pm2 stop discfinanci-api discfinanci-web
```

