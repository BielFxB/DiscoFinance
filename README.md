# DiscFinanci — Sistema de Finanças Pessoais Multi-usuário com Bot no Discord

Sistema completo de finanças pessoais desenvolvido com arquitetura moderna, responsiva e de baixo consumo de recursos, projetado para rodar em servidores Linux (quad-core, 8 GB RAM) gerenciado pelo **PM2**.

Possui duas interfaces de entrada integradas:
1. **Web App Dashboard (Porta 3001):** Visual Dark/Clean moderno, responsivo para celular/desktop, cards de resumo, gráfico de rosca interativo por categoria, barra de progresso do orçamento, gerenciamento de gastos fixos e extrato detalhado.
2. **Bot do Discord (via DM ou canais):** Lançamentos rápidos em linguagem natural (ex: *"Almoço 25.50 alimentação"*, *"Salário 3000 entrada"*), slash commands (`/gasto`, `/entrada`, `/resumo`, `/fixos`, `/vincular`) e confirmações elegantes com Discord Embeds.

---

## 1. Mapeamento de Portas e Arquitetura

O sistema respeita os serviços existentes nas portas 3000 e 8000:

| Serviço | Porta Local | Descrição |
| :--- | :--- | :--- |
| **Backend (FastAPI)** | `127.0.0.1:8001` | API REST assíncrona + lifespan do bot Discord |
| **Frontend (React/Vite)** | `127.0.0.1:3001` | Dashboard SPA pronta para Cloudflare Tunnel |
| **Discord Bot** | N/A (WebSocket) | Processo assíncrono conectado aos servidores do Discord |
| **Banco de Dados** | Supabase (PostgreSQL) | Multi-inquilino com RLS e trigger de categorias |

---

## 2. Configuração do Banco de Dados (Supabase)

1. Acesse o painel do seu projeto no [Supabase](https://supabase.com).
2. Vá em **SQL Editor** -> **New query**.
3. Copie o conteúdo do arquivo [`schema.sql`](./schema.sql) e execute.
4. O script criará:
   - Tabela `users` com suporte a vínculo Discord (`discord_id`, `discord_link_token`).
   - Tabela `categories` com cores e ícones padrão.
   - Tabela `recurring_expenses` para gastos fixos e controle de vencimento.
   - Tabela `transactions` para despesas e receitas.
   - Índices de alta performance e gatilho automático que popula 9 categorias padrão para todo novo usuário cadastrado.

---

## 3. Passo a Passo: Criação e Configuração do Bot no Discord

Para que o bot possa ler mensagens em DM e registrar gastos por linguagem natural, a permissão privilegiada **Message Content Intent** é estritamente necessária:

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications).
2. Clique em **New Application**, digite o nome `DiscFinanci` e confirme.
3. No menu lateral esquerdo, vá em **Bot**:
   - Clique em **Reset Token** e copie o token gerado (guarde para o `backend/.env`).
   - Role até a seção **Privileged Gateway Intents**.
   - Ative a opção **MESSAGE CONTENT INTENT** (obrigatório para que o bot leia mensagens como *"Almoço 25.50"*).
   - Ative também **SERVER MEMBERS INTENT** e salve as alterações.
4. No menu lateral esquerdo, vá em **OAuth2** -> **URL Generator**:
   - Em **Scopes**, marque: `bot` e `applications.commands`.
   - Em **Bot Permissions**, marque:
     - `Send Messages`
     - `Send Messages in Threads`
     - `Embed Links`
     - `Attach Files`
     - `Read Message History`
     - `Use Slash Commands`
5. Copie a URL gerada no final da página, abra no seu navegador e adicione o bot ao seu servidor Discord pessoal ou envie uma mensagem direta (DM) para ele.

---

## 4. Configuração das Variáveis de Ambiente

### Backend (`backend/.env`)
Crie o arquivo `backend/.env` baseado no `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

Edite os valores:
```env
PORT=8001
HOST=127.0.0.1
CORS_ORIGINS=http://localhost:3001,http://127.0.0.1:3001

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-do-supabase

# JWT
JWT_SECRET=defina_uma_chave_secreta_longa_e_aleatoria_aqui
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=30

# Discord Bot Token
DISCORD_BOT_TOKEN=seu_bot_token_do_discord_aqui
```

### Frontend (`frontend/.env`)
Crie o arquivo `frontend/.env` baseado no `frontend/.env.example`:

```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_API_URL=http://localhost:8001
```

*(Em ambiente de produção com domínio ou Cloudflare Tunnel, você pode alterar `VITE_API_URL` para o endereço público do backend ou usar proxy reverso).*

---

## 5. Instalação e Execução Local / Servidor Linux

### Preparando o Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Preparando e Compilando o Frontend
```bash
cd ../frontend
npm install
npm run build
```

---

## 6. Gerenciamento com PM2 em Produção

O arquivo [`ecosystem.config.js`](./ecosystem.config.js) na raiz do projeto está pré-configurado para inicializar ambos os serviços com limites de memória otimizados para um servidor de 8 GB RAM.

1. Instale o PM2 globalmente (se ainda não tiver):
   ```bash
   npm install -g pm2
   ```

2. Crie o diretório de logs:
   ```bash
   mkdir -p logs
   ```

3. Inicie os processos pelo ecossistema:
   ```bash
   pm2 start ecosystem.config.js
   ```

4. Verifique o status:
   ```bash
   pm2 status
   ```

5. Salve os processos para reiniciar com o sistema operacional:
   ```bash
   pm2 save
   pm2 startup
   ```

---

## 7. Como Apontar pelo Cloudflare Tunnel

Se você utiliza o Cloudflare Tunnel (`cloudflared`) para expor o Frontend para a internet:

```bash
# Apontando para o frontend na porta 3001
cloudflared tunnel route dns <nome-do-tunnel> financas.seudominio.com

# No arquivo config.yml do cloudflared:
ingress:
  - hostname: financas.seudominio.com
    service: http://127.0.0.1:3001
  - service: http_status:404
```

---

## 8. Como Usar o Sistema

### Vinculação da Conta no Discord
1. Acesse o Web App em `http://localhost:3001` (ou pelo seu domínio).
2. Crie uma conta ou faça login.
3. Acesse a aba **Discord & Configurações**.
4. Clique em **Gerar Código de Vinculação** (ex: `7K9X2B`).
5. No Discord, envie uma mensagem direta (DM) para o bot ou use em um canal:
   ```text
   /vincular 7K9X2B
   ```
6. O bot confirmará o vínculo e você receberá notificações instantâneas!

### Lançamentos Rápidos por Chat
Envie mensagens para o bot via DM ou use a barra de lançamento rápido no Web App:
- `Almoço 25.50 alimentação` *(Cria despesa de R$ 25,50 na categoria Alimentação)*
- `Uber 14,00 transporte` *(Cria despesa de R$ 14,00 na categoria Transporte)*
- `Salário 3500 entrada` *(Cria receita de R$ 3.500,00)*
- `Mercado Carrefour 182,45` *(Identifica mercado e categoria automaticamente)*
- `+150 freelance` *(Cria receita de R$ 150,00)*
- `/resumo` *(Mostra total de entradas, despesas, fixos e saldo projetado)*
- `/fixos` *(Lista todas as contas fixas cadastradas e seus vencimentos)*

