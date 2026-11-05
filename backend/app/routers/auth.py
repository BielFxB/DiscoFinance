import random
import string
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends

from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.database import get_supabase
from app.models import (
    UserRegister,
    UserLogin,
    UserBalanceUpdate,
    AuthResponse,
    UserResponse,
    DiscordLinkTokenResponse
)

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])

def generate_link_token(length: int = 6) -> str:
    """Gera um token curto e fácil de digitar no Discord (ex: '7K9X2B')."""
    chars = string.ascii_uppercase + string.digits
    # Remove caracteres confusos (0, O, 1, I)
    chars = "".join([c for c in chars if c not in "0OI1"])
    return "".join(random.choices(chars, k=length))

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister):
    supabase = get_supabase()
    email_clean = payload.email.lower().strip()

    # Verificar se e-mail já existe
    existing = supabase.table("users").select("id").eq("email", email_clean).limit(1).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma conta cadastrada com este endereço de e-mail."
        )

    # Hash da senha
    pw_hash = hash_password(payload.password)

    # Inserir novo usuário
    insert_res = supabase.table("users").insert({
        "name": payload.name.strip(),
        "email": email_clean,
        "password_hash": pw_hash,
        "initial_balance": round(payload.initial_balance, 2)
    }).execute()

    if not insert_res.data or len(insert_res.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao criar usuário no banco de dados."
        )

    user_data = insert_res.data[0]
    token = create_access_token({"sub": user_data["id"], "email": user_data["email"]})

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            name=user_data["name"],
            initial_balance=float(user_data.get("initial_balance", 0.0) or 0.0),
            discord_id=user_data.get("discord_id"),
            is_discord_linked=bool(user_data.get("discord_id")),
            created_at=str(user_data.get("created_at"))
        )
    )

@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLogin):
    supabase = get_supabase()
    email_clean = payload.email.lower().strip()

    res = supabase.table("users").select("id, email, name, password_hash, initial_balance, discord_id, created_at").eq("email", email_clean).limit(1).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos."
        )

    user_data = res.data[0]
    if not verify_password(payload.password, user_data["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos."
        )

    token = create_access_token({"sub": user_data["id"], "email": user_data["email"]})

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            name=user_data["name"],
            initial_balance=float(user_data.get("initial_balance", 0.0) or 0.0),
            discord_id=user_data.get("discord_id"),
            is_discord_linked=bool(user_data.get("discord_id")),
            created_at=str(user_data.get("created_at"))
        )
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        initial_balance=float(current_user.get("initial_balance", 0.0) or 0.0),
        discord_id=current_user.get("discord_id"),
        is_discord_linked=bool(current_user.get("discord_id")),
        created_at=str(current_user.get("created_at"))
    )

@router.put("/balance", response_model=UserResponse)
async def update_initial_balance(payload: UserBalanceUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Atualiza o saldo da conta do usuário.
    Se mode == 'available', ajusta o saldo para que o Saldo Disponível resultante
    bata exatamente com o valor desejado pelo usuário (descontando transações passadas e economias).
    Se mode == 'initial', atualiza diretamente o saldo inicial histórico de abertura.
    """
    supabase = get_supabase()
    target_val = payload.balance if payload.balance is not None else payload.initial_balance
    if target_val is None:
        target_val = 0.0

    if payload.mode == "available":
        # 1. Buscar transações históricas do usuário
        all_tx_res = supabase.table("transactions") \
            .select("amount, type") \
            .eq("user_id", current_user["id"]) \
            .execute()
        all_tx = all_tx_res.data or []
        all_incomes = sum(float(t["amount"]) for t in all_tx if t["type"] == "INCOME")
        all_expenses = sum(float(t["amount"]) for t in all_tx if t["type"] == "EXPENSE")
        net_tx = all_incomes - all_expenses

        # 2. Buscar economias guardadas
        sav_res = supabase.table("savings") \
            .select("current_amount") \
            .eq("user_id", current_user["id"]) \
            .execute()
        total_saved = sum(float(s["current_amount"]) for s in (sav_res.data or []))

        # available_balance = initial_balance + net_tx - total_saved == target_val
        new_val = round(target_val - net_tx + total_saved, 2)
    else:
        new_val = round(target_val, 2)

    res = supabase.table("users").update({"initial_balance": new_val}).eq("id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao atualizar saldo da conta.")

    user_data = res.data[0]
    return UserResponse(
        id=user_data["id"],
        email=user_data["email"],
        name=user_data["name"],
        initial_balance=float(user_data.get("initial_balance", 0.0) or 0.0),
        discord_id=user_data.get("discord_id"),
        is_discord_linked=bool(user_data.get("discord_id")),
        created_at=str(user_data.get("created_at"))
    )

@router.post("/discord-token", response_model=DiscordLinkTokenResponse)
async def create_discord_link_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Gera um código temporário de 6 caracteres válido por 15 minutos para vinculação via Discord."""
    supabase = get_supabase()
    token = generate_link_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    supabase.table("users").update({
        "discord_link_token": token,
        "discord_link_expires_at": expires_at.isoformat()
    }).eq("id", current_user["id"]).execute()

    return DiscordLinkTokenResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        instructions=f"No Discord, envie uma DM para o bot ou em um canal com o comando: /vincular {token}"
    )

@router.post("/unlink-discord")
async def unlink_discord(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Remove a vinculação do Discord da conta do usuário."""
    supabase = get_supabase()
    supabase.table("users").update({
        "discord_id": None,
        "discord_link_token": None,
        "discord_link_expires_at": None
    }).eq("id", current_user["id"]).execute()

    return {"message": "Conta do Discord desvinculada com sucesso."}

