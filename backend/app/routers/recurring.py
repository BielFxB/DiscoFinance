import re
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query

from app.auth import get_current_user
from app.database import get_supabase
from app.models import (
    RecurringCreate, 
    RecurringUpdate, 
    RecurringResponse,
    RecurringPayRequest
)

router = APIRouter(prefix="/api/recurring", tags=["Gastos Fixos"])

def format_recurring_item(item: dict, paid_info: Optional[dict] = None) -> RecurringResponse:
    cat = item.get("categories") or {}
    return RecurringResponse(
        id=item["id"],
        user_id=item["user_id"],
        description=item["description"],
        amount=float(item["amount"]),
        due_day=int(item["due_day"]),
        category_id=item.get("category_id"),
        category_name=cat.get("name") if isinstance(cat, dict) else None,
        category_color=cat.get("color") if isinstance(cat, dict) else None,
        category_icon=cat.get("icon") if isinstance(cat, dict) else None,
        is_active=bool(item.get("is_active", True)),
        is_paid=bool(paid_info),
        paid_date=str(paid_info.get("date")) if paid_info else None,
        paid_transaction_id=str(paid_info.get("id")) if paid_info else None,
        created_at=str(item.get("created_at"))
    )

@router.get("", response_model=List[RecurringResponse])
async def list_recurring(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year

    first_day = f"{target_year}-{target_month:02d}-01"
    next_m = target_month + 1 if target_month < 12 else 1
    next_y = target_year if target_month < 12 else target_year + 1
    last_day = f"{next_y}-{next_m:02d}-01"

    # 1. Buscar despesas fixas
    res = supabase.table("recurring_expenses") \
        .select("id, user_id, description, amount, due_day, category_id, is_active, created_at, categories(name, color, icon)") \
        .eq("user_id", current_user["id"]) \
        .order("due_day") \
        .execute()
    recurring_items = res.data or []

    # 2. Buscar transações de pagamento deste mês
    tx_res = supabase.table("transactions") \
        .select("id, description, date") \
        .eq("user_id", current_user["id"]) \
        .gte("date", first_day) \
        .lt("date", last_day) \
        .execute()
    
    paid_map = {}
    for tx in (tx_res.data or []):
        desc = tx.get("description", "")
        match = re.search(r"\[Fixo:([a-f0-9\-]+)\]", desc)
        if match:
            rec_id = match.group(1)
            paid_map[rec_id] = tx

    return [format_recurring_item(i, paid_info=paid_map.get(i["id"])) for i in recurring_items]

@router.post("", response_model=RecurringResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring(payload: RecurringCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()

    insert_data = {
        "user_id": current_user["id"],
        "description": payload.description.strip(),
        "amount": round(payload.amount, 2),
        "due_day": payload.due_day,
        "category_id": payload.category_id,
        "is_active": payload.is_active
    }

    res = supabase.table("recurring_expenses").insert(insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao criar despesa fixa.")

    created_id = res.data[0]["id"]
    fetch_res = supabase.table("recurring_expenses") \
        .select("id, user_id, description, amount, due_day, category_id, is_active, created_at, categories(name, color, icon)") \
        .eq("id", created_id).limit(1).execute()

    return format_recurring_item(fetch_res.data[0])

@router.post("/{recurring_id}/pay", response_model=RecurringResponse)
async def pay_recurring(
    recurring_id: str,
    payload: Optional[RecurringPayRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Marca um gasto fixo como PAGO no mês selecionado.
    Gera automaticamente uma transação de DESPESA que desconta imediatamente do saldo em conta!
    """
    supabase = get_supabase()
    rec_res = supabase.table("recurring_expenses") \
        .select("id, user_id, description, amount, due_day, category_id, is_active, created_at, categories(name, color, icon)") \
        .eq("id", recurring_id) \
        .eq("user_id", current_user["id"]) \
        .limit(1) \
        .execute()

    if not rec_res.data:
        raise HTTPException(status_code=404, detail="Despesa fixa não encontrada.")
    recurring = rec_res.data[0]

    now = datetime.now()
    target_month = (payload.month if payload and payload.month else None) or now.month
    target_year = (payload.year if payload and payload.year else None) or now.year
    pay_date = (payload.date if payload and payload.date else None) or date.today()

    first_day = f"{target_year}-{target_month:02d}-01"
    next_m = target_month + 1 if target_month < 12 else 1
    next_y = target_year if target_month < 12 else target_year + 1
    last_day = f"{next_y}-{next_m:02d}-01"

    tag = f"[Fixo:{recurring_id}]"

    # Verificar se já foi pago neste mês
    existing_tx = supabase.table("transactions") \
        .select("id, date") \
        .eq("user_id", current_user["id"]) \
        .like("description", f"%{tag}%") \
        .gte("date", first_day) \
        .lt("date", last_day) \
        .limit(1) \
        .execute()

    if existing_tx.data:
        return format_recurring_item(recurring, paid_info=existing_tx.data[0])

    # Criar transação de despesa (isso desconta automaticamente do saldo em conta!)
    insert_tx = {
        "user_id": current_user["id"],
        "description": f"{recurring['description']} {tag}",
        "amount": float(recurring["amount"]),
        "type": "EXPENSE",
        "category_id": recurring.get("category_id"),
        "date": str(pay_date)
    }
    tx_res = supabase.table("transactions").insert(insert_tx).execute()
    if not tx_res.data:
        raise HTTPException(status_code=500, detail="Erro ao registrar pagamento do gasto fixo.")

    return format_recurring_item(recurring, paid_info=tx_res.data[0])

@router.post("/{recurring_id}/unpay", response_model=RecurringResponse)
async def unpay_recurring(
    recurring_id: str,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Desfaz o pagamento de um gasto fixo no mês.
    Exclui a transação correspondente, devolvendo o valor ao saldo disponível em conta.
    """
    supabase = get_supabase()
    rec_res = supabase.table("recurring_expenses") \
        .select("id, user_id, description, amount, due_day, category_id, is_active, created_at, categories(name, color, icon)") \
        .eq("id", recurring_id) \
        .eq("user_id", current_user["id"]) \
        .limit(1) \
        .execute()

    if not rec_res.data:
        raise HTTPException(status_code=404, detail="Despesa fixa não encontrada.")
    recurring = rec_res.data[0]

    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year

    first_day = f"{target_year}-{target_month:02d}-01"
    next_m = target_month + 1 if target_month < 12 else 1
    next_y = target_year if target_month < 12 else target_year + 1
    last_day = f"{next_y}-{next_m:02d}-01"

    tag = f"[Fixo:{recurring_id}]"

    # Encontrar a transação para excluir
    existing_tx = supabase.table("transactions") \
        .select("id") \
        .eq("user_id", current_user["id"]) \
        .like("description", f"%{tag}%") \
        .gte("date", first_day) \
        .lt("date", last_day) \
        .limit(1) \
        .execute()

    if existing_tx.data:
        tx_id = existing_tx.data[0]["id"]
        supabase.table("transactions").delete().eq("id", tx_id).execute()

    return format_recurring_item(recurring, paid_info=None)

@router.put("/{recurring_id}", response_model=RecurringResponse)
async def update_recurring(recurring_id: str, payload: RecurringUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()
    update_data = {}
    if payload.description is not None:
        update_data["description"] = payload.description.strip()
    if payload.amount is not None:
        update_data["amount"] = round(payload.amount, 2)
    if payload.due_day is not None:
        update_data["due_day"] = payload.due_day
    if payload.category_id is not None:
        update_data["category_id"] = payload.category_id
    if payload.is_active is not None:
        update_data["is_active"] = payload.is_active

    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado informado para atualização.")

    res = supabase.table("recurring_expenses").update(update_data).eq("id", recurring_id).eq("user_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Despesa fixa não encontrada.")

    fetch_res = supabase.table("recurring_expenses") \
        .select("id, user_id, description, amount, due_day, category_id, is_active, created_at, categories(name, color, icon)") \
        .eq("id", recurring_id).limit(1).execute()

    return format_recurring_item(fetch_res.data[0])

@router.patch("/{recurring_id}/toggle", response_model=RecurringResponse)
async def toggle_recurring(recurring_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()
    current = supabase.table("recurring_expenses").select("is_active").eq("id", recurring_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Despesa fixa não encontrada.")

    new_state = not current.data[0]["is_active"]
    supabase.table("recurring_expenses").update({"is_active": new_state}).eq("id", recurring_id).eq("user_id", current_user["id"]).execute()

    fetch_res = supabase.table("recurring_expenses") \
        .select("id, user_id, description, amount, due_day, category_id, is_active, created_at, categories(name, color, icon)") \
        .eq("id", recurring_id).limit(1).execute()

    return format_recurring_item(fetch_res.data[0])

@router.delete("/{recurring_id}")
async def delete_recurring(recurring_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()
    res = supabase.table("recurring_expenses").delete().eq("id", recurring_id).eq("user_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Despesa fixa não encontrada.")
    return {"message": "Despesa fixa removida com sucesso."}
