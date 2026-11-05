import re
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query

from app.auth import get_current_user
from app.database import get_supabase
from app.services.parser import parse_transaction_text
from app.models import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    QuickParseRequest,
    QuickParseResult
)

router = APIRouter(prefix="/api/transactions", tags=["Transações"])

def format_transaction_item(item: dict) -> TransactionResponse:
    cat = item.get("categories") or {}
    raw_desc = item.get("description", "")
    is_recurring = False
    rec_id = None

    # Detecta se é um pagamento de gasto fixo recorrente
    match = re.search(r"\[Fixo:([a-f0-9\-]+)\]", raw_desc)
    clean_desc = raw_desc
    if match:
        is_recurring = True
        rec_id = match.group(1)
        clean_desc = re.sub(r"\s*\[Fixo:[a-f0-9\-]+\]\s*", "", raw_desc).strip()

    return TransactionResponse(
        id=item["id"],
        user_id=item["user_id"],
        description=clean_desc,
        amount=float(item["amount"]),
        type=item["type"],
        category_id=item.get("category_id"),
        category_name=cat.get("name") if isinstance(cat, dict) else None,
        category_color=cat.get("color") if isinstance(cat, dict) else None,
        category_icon=cat.get("icon") if isinstance(cat, dict) else None,
        date=str(item["date"]),
        is_recurring=is_recurring,
        recurring_expense_id=rec_id,
        created_at=str(item.get("created_at"))
    )

@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    category_id: Optional[str] = None,
    type: Optional[str] = Query(None, pattern="^(EXPENSE|INCOME)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    query = supabase.table("transactions") \
        .select("id, user_id, description, amount, type, category_id, date, created_at, categories(name, color, icon)") \
        .eq("user_id", current_user["id"])

    # Filtros de data
    if month and year:
        first_day = f"{year}-{month:02d}-01"
        next_month = month + 1 if month < 12 else 1
        next_year = year if month < 12 else year + 1
        last_day = f"{next_year}-{next_month:02d}-01"
        query = query.gte("date", first_day).lt("date", last_day)
    elif year:
        query = query.gte("date", f"{year}-01-01").lt("date", f"{year + 1}-01-01")

    if category_id:
        query = query.eq("category_id", category_id)

    if type:
        query = query.eq("type", type)

    query = query.order("date", desc=True).order("created_at", desc=True).range(offset, offset + limit - 1)
    res = query.execute()

    return [format_transaction_item(i) for i in (res.data or [])]

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(payload: TransactionCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()

    insert_data = {
        "user_id": current_user["id"],
        "description": payload.description.strip(),
        "amount": round(payload.amount, 2),
        "type": payload.type,
        "category_id": payload.category_id,
        "date": payload.date.isoformat()
    }

    res = supabase.table("transactions").insert(insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao criar transação.")

    created_id = res.data[0]["id"]
    fetch_res = supabase.table("transactions") \
        .select("id, user_id, description, amount, type, category_id, date, created_at, categories(name, color, icon)") \
        .eq("id", created_id).limit(1).execute()

    return format_transaction_item(fetch_res.data[0])

@router.post("/quick-parse", response_model=QuickParseResult)
async def quick_parse_transaction(payload: QuickParseRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Interpreta texto livre como 'Almoço 25.50 alimentação' e opcionalmente salva no banco."""
    try:
        parsed = parse_transaction_text(payload.text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    supabase = get_supabase()
    # Tenta associar à categoria existente do usuário
    category_id = None
    if parsed.get("category_hint"):
        cat_res = supabase.table("categories").select("id, name").eq("user_id", current_user["id"]).execute()
        for c in (cat_res.data or []):
            if c["name"].lower() == parsed["category_hint"].lower():
                category_id = c["id"]
                break

    saved_transaction = None
    if payload.auto_save:
        insert_data = {
            "user_id": current_user["id"],
            "description": parsed["description"],
            "amount": parsed["amount"],
            "type": parsed["type"],
            "category_id": category_id,
            "date": parsed["date"]
        }
        res = supabase.table("transactions").insert(insert_data).execute()
        if res.data:
            created_id = res.data[0]["id"]
            fetch_res = supabase.table("transactions") \
                .select("id, user_id, description, amount, type, category_id, date, created_at, categories(name, color, icon)") \
                .eq("id", created_id).limit(1).execute()
            if fetch_res.data:
                saved_transaction = format_transaction_item(fetch_res.data[0])

    return QuickParseResult(
        description=parsed["description"],
        amount=parsed["amount"],
        type=parsed["type"],
        category_hint=parsed.get("category_hint"),
        category_id=category_id,
        date=parsed["date"],
        saved=payload.auto_save,
        transaction=saved_transaction
    )

@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(transaction_id: str, payload: TransactionUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()
    update_data = {}
    if payload.description is not None:
        update_data["description"] = payload.description.strip()
    if payload.amount is not None:
        update_data["amount"] = round(payload.amount, 2)
    if payload.type is not None:
        update_data["type"] = payload.type
    if payload.category_id is not None:
        update_data["category_id"] = payload.category_id
    if payload.date is not None:
        update_data["date"] = payload.date.isoformat()

    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado informado para atualização.")

    res = supabase.table("transactions").update(update_data).eq("id", transaction_id).eq("user_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")

    fetch_res = supabase.table("transactions") \
        .select("id, user_id, description, amount, type, category_id, date, created_at, categories(name, color, icon)") \
        .eq("id", transaction_id).limit(1).execute()

    return format_transaction_item(fetch_res.data[0])

@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()
    res = supabase.table("transactions").delete().eq("id", transaction_id).eq("user_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")
    return {"message": "Transação removida com sucesso."}

