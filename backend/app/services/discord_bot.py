import asyncio
import logging
from datetime import datetime, timezone, date
from typing import Optional, Dict, Any, List, Tuple

import discord
from discord import app_commands
from discord.ext import commands

from app.config import settings
from app.database import get_supabase
from app.services.parser import parse_transaction_text

logger = logging.getLogger("financas.discord")

# Configurar intents do Discord (Necessário Privileged Intent: Message Content)
intents = discord.Intents.default()
intents.message_content = True
intents.dm_messages = True

bot = commands.Bot(command_prefix="!", intents=intents)

def format_currency(val: float) -> str:
    """Formata valor float para o padrão brasileiro R$ 1.250,50."""
    formatted = f"{val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {formatted}"

def find_user_by_discord_id(discord_id: str) -> Optional[Dict[str, Any]]:
    """Busca o usuário no Supabase a partir do seu discord_id."""
    try:
        supabase = get_supabase()
        res = supabase.table("users").select("id, email, name, discord_id").eq("discord_id", str(discord_id)).limit(1).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None
    except Exception as e:
        logger.error(f"Erro ao buscar usuário por discord_id: {e}")
        return None

def resolve_category(user_id: str, category_hint: Optional[str]) -> Optional[Dict[str, Any]]:
    """Tenta localizar a categoria do usuário pelo nome aproximado."""
    if not category_hint:
        return None
    try:
        supabase = get_supabase()
        res = supabase.table("categories").select("id, name, color, icon").eq("user_id", user_id).execute()
        categories: List[Dict[str, Any]] = res.data or []
        
        hint_lower = category_hint.strip().lower()
        for cat in categories:
            if cat["name"].strip().lower() == hint_lower:
                return cat
        
        # Match parcial
        for cat in categories:
            if hint_lower in cat["name"].strip().lower() or cat["name"].strip().lower() in hint_lower:
                return cat
        return None
    except Exception as e:
        logger.error(f"Erro ao resolver categoria: {e}")
        return None

def create_transaction_embed(
    user_name: str,
    description: str,
    amount: float,
    tx_type: str,
    category_name: str,
    tx_date: str,
    balance_note: Optional[str] = None
) -> discord.Embed:
    """Gera um Embed estético e moderno para confirmar o lançamento."""
    is_income = tx_type.upper() == "INCOME"
    color = discord.Color.from_rgb(16, 185, 129) if is_income else discord.Color.from_rgb(239, 68, 68)
    title = "📈 Receita Registrada!" if is_income else "📉 Despesa Registrada!"

    embed = discord.Embed(
        title=title,
        description=f"**{description}**",
        color=color,
        timestamp=datetime.now(timezone.utc)
    )
    embed.add_field(name="💰 Valor", value=f"`{format_currency(amount)}`", inline=True)
    embed.add_field(name="🏷️ Categoria", value=category_name, inline=True)
    embed.add_field(name="📅 Data", value=tx_date, inline=True)

    footer_text = f"Usuário: {user_name}"
    if balance_note:
        footer_text += f" • {balance_note}"
    embed.set_footer(text=footer_text, icon_url="https://cdn-icons-png.flaticon.com/512/550/550638.png")
    return embed

def link_user_account(discord_id: str, code: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Valida e associa a conta do Discord ao usuário do Web App."""
    clean_token = code.strip().upper()
    for prefix in ["/VINCULAR", "!VINCULAR", "VINCULAR"]:
        if clean_token.startswith(prefix):
            clean_token = clean_token[len(prefix):].strip()

    if not clean_token:
        return False, "Por favor, informe o código de vinculação de 6 caracteres gerado no Web App.", None

    try:
        supabase = get_supabase()
        res = supabase.table("users").select("id, name, email, discord_link_expires_at").eq("discord_link_token", clean_token).limit(1).execute()
        
        if not res.data or len(res.data) == 0:
            return False, "Código de vinculação inválido ou não encontrado. Gere um novo código no Web App.", None

        user = res.data[0]
        if user.get("discord_link_expires_at"):
            exp = datetime.fromisoformat(user["discord_link_expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                return False, "Este código expirou. Por favor, gere um novo código no Web App.", None

        # Atualiza o discord_id do usuário e limpa o token
        supabase.table("users").update({
            "discord_id": str(discord_id),
            "discord_link_token": None,
            "discord_link_expires_at": None
        }).eq("id", user["id"]).execute()

        return True, f"Conta vinculada com sucesso a **{user['name']}**!", user
    except Exception as e:
        logger.error(f"Erro ao vincular conta: {e}")
        return False, f"Erro interno ao vincular conta: {str(e)}", None

# ----------------- EVENTOS DO BOT -----------------

@bot.event
async def on_ready():
    logger.info(f"🤖 Bot do Discord logado com sucesso como: {bot.user} (ID: {bot.user.id})")
    try:
        synced = await bot.tree.sync()
        logger.info(f"Comandos Slash sincronizados: {len(synced)} comandos.")
    except Exception as e:
        logger.error(f"Falha ao sincronizar comandos slash: {e}")

@bot.event
async def on_message(message: discord.Message):
    # Ignora mensagens enviadas pelo próprio bot
    if message.author.bot:
        return

    # Processa mensagens em DM (Mensagem Direta) ou menções diretas ao bot
    is_dm = isinstance(message.channel, discord.DMChannel)
    is_mention = bot.user in message.mentions if bot.user else False

    if is_dm or is_mention:
        content = message.content.replace(f"<@{bot.user.id}>", "").strip() if bot.user else message.content.strip()
        discord_id = str(message.author.id)

        # 1. Verificar se a mensagem é uma tentativa de vinculação (ex: 7K9X2B, vincular 7K9X2B, /vincular 7K9X2B)
        content_upper = content.upper().strip()
        is_link_cmd = (
            content_upper.startswith("/VINCULAR") or 
            content_upper.startswith("!VINCULAR") or 
            content_upper.startswith("VINCULAR") or
            (len(content_upper) == 6 and content_upper.isalnum())
        )

        if is_link_cmd:
            success, msg, linked_user = await asyncio.to_thread(link_user_account, discord_id, content)
            if success and linked_user:
                embed = discord.Embed(
                    title="🎉 Conta Vinculada com Sucesso!",
                    description=(
                        f"Olá **{linked_user['name']}**! Sua conta do Discord foi vinculada ao DiscFinanci.\n\n"
                        "**Agora você pode me enviar mensagens diretas aqui na DM para lançar tudo:**\n"
                        "• `Almoço 25.50 alimentação`\n"
                        "• `Uber 14 transporte`\n"
                        "• `Salário 3500 entrada`\n"
                        "• `+150 freelance`\n"
                        "• `/resumo` ou `/fixos`"
                    ),
                    color=discord.Color.from_rgb(16, 185, 129)
                )
                await message.reply(embed=embed)
                return
            elif content_upper.startswith("/VINCULAR") or content_upper.startswith("!VINCULAR") or content_upper.startswith("VINCULAR"):
                await message.reply(f"❌ {msg}")
                return

        # Se for outro comando slash, deixa o sistema de comandos do Discord processar
        if content.startswith("/"):
            return

        user = await asyncio.to_thread(find_user_by_discord_id, discord_id)

        if not user:
            embed = discord.Embed(
                title="🔒 Conta do Discord Não Vinculada",
                description=(
                    "Olá! Não encontrei sua conta financeira associada a este usuário do Discord.\n\n"
                    "**Como vincular agora mesmo:**\n"
                    "1. Acesse o **DiscFinanci Web App** (aba Discord & Configurações).\n"
                    "2. Clique em **Gerar Código de Vinculação**.\n"
                    "3. Responda diretamente nesta conversa com o seu código (ex: `7K9X2B` ou `/vincular 7K9X2B`)."
                ),
                color=discord.Color.from_rgb(245, 158, 11)
            )
            await message.reply(embed=embed)
            return

        # Usuário autenticado: analisar o texto com o parser inteligente
        try:
            parsed = parse_transaction_text(content)
        except Exception as e:
            embed = discord.Embed(
                title="❓ Formato não reconhecido",
                description=(
                    f"Não consegui identificar os dados na mensagem:\n> *\"{content}\"*\n\n"
                    "**Exemplos aceitos:**\n"
                    "• `Almoço 25.50 alimentação`\n"
                    "• `Uber 14 transporte`\n"
                    "• `Salário 3500 entrada`\n"
                    "• `Mercado 120,40`\n"
                    "• `+150 freelance`"
                ),
                color=discord.Color.from_rgb(100, 116, 139)
            )
            await message.reply(embed=embed)
            return

        # Resolver categoria
        cat = resolve_category(user["id"], parsed["category_hint"])
        category_id = cat["id"] if cat else None
        category_name = cat["name"] if cat else (parsed["category_hint"] or "Geral")

        # Inserir no Supabase
        try:
            supabase = get_supabase()
            insert_data = {
                "user_id": user["id"],
                "description": parsed["description"],
                "amount": parsed["amount"],
                "type": parsed["type"],
                "category_id": category_id,
                "date": parsed["date"]
            }
            res = supabase.table("transactions").insert(insert_data).execute()
            
            embed = create_transaction_embed(
                user_name=user["name"],
                description=parsed["description"],
                amount=parsed["amount"],
                tx_type=parsed["type"],
                category_name=category_name,
                tx_date=parsed["date"],
                balance_note="Salvo com sucesso via DM!"
            )
            await message.reply(embed=embed)
        except Exception as e:
            logger.error(f"Erro ao salvar transação via DM: {e}")
            await message.reply(f"❌ Erro ao registrar transação no banco de dados: {str(e)}")

    await bot.process_commands(message)

# ----------------- SLASH COMMANDS -----------------

@bot.tree.command(name="vincular", description="Vincula sua conta do Discord ao DiscFinanci Web App")
@app_commands.describe(codigo="Código de vinculação de 6 caracteres gerado no Web App")
async def cmd_vincular(interaction: discord.Interaction, codigo: str):
    await interaction.response.defer(ephemeral=True)
    success, msg, user = await asyncio.to_thread(link_user_account, str(interaction.user.id), codigo)

    if not success or not user:
        await interaction.followup.send(f"❌ {msg}", ephemeral=True)
        return

    embed = discord.Embed(
        title="🎉 Conta Vinculada com Sucesso!",
        description=(
            f"Olá **{user['name']}**! Sua conta do Discord foi vinculada ao seu painel financeiro.\n\n"
            "**Agora você pode:**\n"
            "• Me enviar mensagens diretas (DM) como `Almoço 25.50 alimentação`\n"
            "• Usar `/gasto`, `/entrada`, `/resumo` e `/fixos` em qualquer canal!\n"
        ),
        color=discord.Color.from_rgb(16, 185, 129)
    )
    await interaction.followup.send(embed=embed, ephemeral=True)

@bot.tree.command(name="gasto", description="Registra uma nova despesa rapidamente")
@app_commands.describe(
    descricao="Descrição do gasto (ex: Almoço, Gasolina)",
    valor="Valor monetário (ex: 35.50 ou 35,50)",
    categoria="Nome da categoria (opcional)"
)
async def cmd_gasto(interaction: discord.Interaction, descricao: str, valor: str, categoria: Optional[str] = None):
    await interaction.response.defer()
    discord_id = str(interaction.user.id)
    user = find_user_by_discord_id(discord_id)

    if not user:
        await interaction.followup.send(
            "🔒 Sua conta do Discord não está vinculada. Use `/vincular <codigo>` com o código do Web App.",
            ephemeral=True
        )
        return

    # Tratar valor
    try:
        clean_val = valor.replace("R$", "").replace(" ", "").replace(",", ".")
        amount = float(clean_val)
        if amount <= 0:
            raise ValueError()
    except Exception:
        await interaction.followup.send("❌ Valor inválido. Informe um número válido como `25.50` ou `25,50`.", ephemeral=True)
        return

    cat = resolve_category(user["id"], categoria)
    category_id = cat["id"] if cat else None
    cat_name = cat["name"] if cat else (categoria or "Geral")

    try:
        supabase = get_supabase()
        today = date.today().isoformat()
        supabase.table("transactions").insert({
            "user_id": user["id"],
            "description": descricao.strip().capitalize(),
            "amount": round(amount, 2),
            "type": "EXPENSE",
            "category_id": category_id,
            "date": today
        }).execute()

        embed = create_transaction_embed(
            user_name=user["name"],
            description=descricao.strip().capitalize(),
            amount=round(amount, 2),
            tx_type="EXPENSE",
            category_name=cat_name,
            tx_date=today
        )
        await interaction.followup.send(embed=embed)
    except Exception as e:
        logger.error(f"Erro no comando /gasto: {e}")
        await interaction.followup.send(f"❌ Falha ao salvar despesa: {str(e)}", ephemeral=True)

@bot.tree.command(name="entrada", description="Registra uma nova receita (salário, freelance, etc.)")
@app_commands.describe(
    descricao="Descrição da receita (ex: Salário, Venda, Freelance)",
    valor="Valor monetário (ex: 3000 ou 150.00)",
    categoria="Nome da categoria (opcional)"
)
async def cmd_entrada(interaction: discord.Interaction, descricao: str, valor: str, categoria: Optional[str] = None):
    await interaction.response.defer()
    discord_id = str(interaction.user.id)
    user = find_user_by_discord_id(discord_id)

    if not user:
        await interaction.followup.send(
            "🔒 Sua conta do Discord não está vinculada. Use `/vincular <codigo>` com o código do Web App.",
            ephemeral=True
        )
        return

    try:
        clean_val = valor.replace("R$", "").replace(" ", "").replace(",", ".")
        amount = float(clean_val)
        if amount <= 0:
            raise ValueError()
    except Exception:
        await interaction.followup.send("❌ Valor inválido. Informe um número válido como `3000` ou `150,50`.", ephemeral=True)
        return

    cat = resolve_category(user["id"], categoria)
    category_id = cat["id"] if cat else None
    cat_name = cat["name"] if cat else (categoria or "Receitas")

    try:
        supabase = get_supabase()
        today = date.today().isoformat()
        supabase.table("transactions").insert({
            "user_id": user["id"],
            "description": descricao.strip().capitalize(),
            "amount": round(amount, 2),
            "type": "INCOME",
            "category_id": category_id,
            "date": today
        }).execute()

        embed = create_transaction_embed(
            user_name=user["name"],
            description=descricao.strip().capitalize(),
            amount=round(amount, 2),
            tx_type="INCOME",
            category_name=cat_name,
            tx_date=today
        )
        await interaction.followup.send(embed=embed)
    except Exception as e:
        logger.error(f"Erro no comando /entrada: {e}")
        await interaction.followup.send(f"❌ Falha ao salvar receita: {str(e)}", ephemeral=True)

@bot.tree.command(name="resumo", description="Exibe o resumo financeiro consolidado do mês atual")
async def cmd_resumo(interaction: discord.Interaction):
    await interaction.response.defer()
    discord_id = str(interaction.user.id)
    user = find_user_by_discord_id(discord_id)

    if not user:
        await interaction.followup.send(
            "🔒 Sua conta do Discord não está vinculada. Use `/vincular <codigo>`.",
            ephemeral=True
        )
        return

    now = datetime.now()
    first_day = f"{now.year}-{now.month:02d}-01"
    # Último dia estimado
    next_month = now.month + 1 if now.month < 12 else 1
    next_year = now.year if now.month < 12 else now.year + 1
    last_day = f"{next_year}-{next_month:02d}-01"

    try:
        supabase = get_supabase()
        
        # Buscar saldo inicial
        u_res = supabase.table("users").select("initial_balance").eq("id", user["id"]).limit(1).execute()
        initial_balance = float(u_res.data[0].get("initial_balance", 0.0) or 0.0) if u_res.data else 0.0

        # Buscar todas as transações para calcular saldo acumulado
        all_tx_res = supabase.table("transactions").select("amount, type").eq("user_id", user["id"]).execute()
        all_tx = all_tx_res.data or []
        all_incomes = sum(float(t["amount"]) for t in all_tx if t["type"] == "INCOME")
        all_expenses = sum(float(t["amount"]) for t in all_tx if t["type"] == "EXPENSE")
        gross_balance = initial_balance + all_incomes - all_expenses

        # Buscar economias guardadas
        sav_res = supabase.table("savings").select("current_amount").eq("user_id", user["id"]).execute()
        total_saved = sum(float(s["current_amount"]) for s in (sav_res.data or []))

        # Saldo livre real em conta
        available_balance = gross_balance - total_saved

        # Buscar transações do mês
        tx_res = supabase.table("transactions") \
            .select("amount, type, category_id") \
            .eq("user_id", user["id"]) \
            .gte("date", first_day) \
            .lt("date", last_day) \
            .execute()
        
        # Buscar gastos fixos ativos
        rec_res = supabase.table("recurring_expenses") \
            .select("amount") \
            .eq("user_id", user["id"]) \
            .eq("is_active", True) \
            .execute()

        transactions = tx_res.data or []
        recurring = rec_res.data or []

        total_income = sum(float(t["amount"]) for t in transactions if t["type"] == "INCOME")
        total_expenses = sum(float(t["amount"]) for t in transactions if t["type"] == "EXPENSE")
        total_recurring = sum(float(r["amount"]) for r in recurring)

        embed = discord.Embed(
            title=f"📊 Resumo Financeiro - {now.strftime('%B/%Y').capitalize()}",
            description=f"Visão consolidada das finanças de **{user['name']}**",
            color=discord.Color.from_rgb(59, 130, 246),
            timestamp=datetime.now(timezone.utc)
        )

        embed.add_field(name="💳 Saldo Livre em Conta", value=f"`{format_currency(available_balance)}`", inline=True)
        embed.add_field(name="🐷 Total Economizado", value=f"`{format_currency(total_saved)}`", inline=True)
        embed.add_field(name="🟣 Gastos Fixos Ativos", value=f"`{format_currency(total_recurring)}`", inline=True)

        embed.add_field(name="🟢 Entradas do Mês", value=f"`{format_currency(total_income)}`", inline=True)
        embed.add_field(name="🔴 Despesas do Mês", value=f"`{format_currency(total_expenses)}`", inline=True)
        embed.add_field(name="📈 Balanço Mensal", value=f"`{format_currency(total_income - total_expenses)}`", inline=True)

        status_emoji = "🟢" if available_balance >= 0 else "🔴"
        embed.set_footer(text=f"{status_emoji} DiscFinanci Bot • Saldo em conta deduz economias reservadas")
        await interaction.followup.send(embed=embed)
    except Exception as e:
        logger.error(f"Erro no comando /resumo: {e}")
        await interaction.followup.send(f"❌ Erro ao compilar resumo: {str(e)}", ephemeral=True)

@bot.tree.command(name="fixos", description="Lista todas as despesas fixas recorrentes cadastradas")
async def cmd_fixos(interaction: discord.Interaction):
    await interaction.response.defer()
    discord_id = str(interaction.user.id)
    user = find_user_by_discord_id(discord_id)

    if not user:
        await interaction.followup.send(
            "🔒 Sua conta do Discord não está vinculada. Use `/vincular <codigo>`.",
            ephemeral=True
        )
        return

    try:
        supabase = get_supabase()
        now = datetime.now()
        first_day = f"{now.year}-{now.month:02d}-01"
        next_m = now.month + 1 if now.month < 12 else 1
        next_y = now.year if now.month < 12 else now.year + 1
        last_day = f"{next_y}-{next_m:02d}-01"

        res = supabase.table("recurring_expenses") \
            .select("id, description, amount, due_day, is_active") \
            .eq("user_id", user["id"]) \
            .order("due_day") \
            .execute()
        
        items = res.data or []
        if not items:
            await interaction.followup.send("Você ainda não possui despesas fixas cadastradas no Web App.")
            return

        tx_res = supabase.table("transactions") \
            .select("description, amount") \
            .eq("user_id", user["id"]) \
            .gte("date", first_day) \
            .lt("date", last_day) \
            .execute()
        
        import re
        paid_rec_ids = set()
        for tx in (tx_res.data or []):
            m = re.search(r"\[Fixo:([a-f0-9\-]+)\]", tx.get("description", ""))
            if m:
                paid_rec_ids.add(m.group(1))

        lines = []
        paid_total = 0.0
        pending_total = 0.0

        for i in items:
            if not i.get("is_active", True):
                lines.append(f"⏸️ **Dia {i['due_day']:02d}** • {i['description']}: `{format_currency(float(i['amount']))}` *(Inativo)*")
                continue

            amt = float(i["amount"])
            is_paid = i["id"] in paid_rec_ids
            if is_paid:
                paid_total += amt
                lines.append(f"✅ **Dia {i['due_day']:02d}** • {i['description']}: `{format_currency(amt)}` **(PAGO)**")
            else:
                pending_total += amt
                lines.append(f"⏳ **Dia {i['due_day']:02d}** • {i['description']}: `{format_currency(amt)}` *(Pendente)*")

        embed = discord.Embed(
            title=f"📅 Gastos Fixos - {now.strftime('%B/%Y').capitalize()}",
            description="\n".join(lines),
            color=discord.Color.from_rgb(139, 92, 246)
        )
        embed.add_field(name="💰 Total Comprometido", value=f"`{format_currency(paid_total + pending_total)}`", inline=True)
        embed.add_field(name="✅ Já Pago", value=f"`{format_currency(paid_total)}`", inline=True)
        embed.add_field(name="⏳ A Pagar", value=f"`{format_currency(pending_total)}`", inline=True)
        embed.set_footer(text="Ao marcar como pago no Web App, o valor é debitado do saldo em conta.")
        await interaction.followup.send(embed=embed)
    except Exception as e:
        logger.error(f"Erro no comando /fixos: {e}")
        await interaction.followup.send(f"❌ Erro ao buscar gastos fixos: {str(e)}", ephemeral=True)

# ----------------- INICIALIZADOR ASYNC -----------------

_bot_task: Optional[asyncio.Task] = None

async def start_discord_bot():
    """Inicia o bot do Discord como tarefa em background."""
    global _bot_task
    token = settings.DISCORD_BOT_TOKEN
    if not token or token == "seu-discord-bot-token-aqui":
        logger.warning(
            "⚠️ DISCORD_BOT_TOKEN não informado no .env! O bot do Discord NÃO será iniciado."
        )
        return

    logger.info("Iniciando Discord Bot em background...")
    _bot_task = asyncio.create_task(bot.start(token))

async def stop_discord_bot():
    """Encerra graciosamente a conexão do bot do Discord."""
    global _bot_task
    if bot.is_closed():
        return
    logger.info("Encerrando bot do Discord...")
    await bot.close()
    if _bot_task and not _bot_task.done():
        _bot_task.cancel()
        try:
            await _bot_task
        except asyncio.CancelledError:
            pass
    logger.info("Bot do Discord finalizado.")

