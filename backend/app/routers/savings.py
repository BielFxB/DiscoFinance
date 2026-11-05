from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends

from app.auth import get_current_user
from app.database import get_supabase
from app.models import (
    SavingsCreate,
    SavingsUpdate,
    SavingsDepositWithdraw,
    SavingsResponse
)

router = APIRouter(prefix="/api/savings", tags=["Economias e Metas"])

def format_savings_item(item: dict) -> SavingsResponse:
    target = float(item.get("target_amount") or 0.0)
    current = float(item.get("current_amount") or 0.0)
    pct = round((current / target * 100), 1) if target > 0 else 0.0

    return SavingsResponse(
        id=item["id"],
        user_id=item["user_id"],
        name=item["name"],
        target_amount=target,
        current_amount=current,
        percentage=pct,
        color=item.get("color") or "#3B82F6",
        icon=item.get("icon") or "PiggyBank",
        target_date=str(item["target_date"]) if item.get("target_date") else None,
        created_at=str(item.get("created_at"))
    )

@router.get("", response_model=List[SavingsResponse])
async def list_savings(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Lista todas as economias / cofrinhos do usuário."""
    supabase = get_supabase()
    res = supabase.table("savings").select("*").eq("user_id", current_user["id"]).order("created_at").execute()
    data = res.data or []
    return [format_savings_item(i) for i in data]

@router.post("", response_model=SavingsResponse, status_code=status.HTTP_201_CREATED)
async def create_savings(payload: SavingsCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Cria uma nova economia ou meta de gastos futuros."""
    supabase = get_supabase()

    insert_data = {
        "user_id": current_user["id"],
        "name": payload.name.strip(),
        "target_amount": round(payload.target_amount, 2),
        "current_amount": round(payload.current_amount, 2),
        "color": payload.color,
        "icon": payload.icon,
        "target_date": payload.target_date.isoformat() if payload.target_date else None
    }

    res = supabase.table("savings").insert(insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao criar economia.")

    return format_savings_item(res.data[0])

@router.put("/{savings_id}", response_model=SavingsResponse)
async def update_savings(savings_id: str, payload: SavingsUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Atualiza dados cadastrais da meta / economia."""
    supabase = get_supabase()
    update_data = {}

    if payload.name is not None:
        update_data["name"] = payload.name.strip()
    if payload.target_amount is not None:
        update_data["target_amount"] = round(payload.target_amount, 2)
    if payload.color is not None:
        update_data["color"] = payload.color
    if payload.icon is not None:
        update_data["icon"] = payload.icon
    if payload.target_date is not None:
        update_data["target_date"] = payload.target_date.isoformat()

    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado informado para atualização.")

    res = supabase.table("savings").update(update_data).eq("id", savings_id).eq("user_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Economia não encontrada.")

    return format_savings_item(res.data[0])

@router.post("/{savings_id}/deposit", response_model=SavingsResponse)
async def deposit_savings(savings_id: str, payload: SavingsDepositWithdraw, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Guarda (deposita) um valor na economia. Esse valor sai do saldo livre em conta."""
    supabase = get_supabase()
    
    # Buscar atual
    current = supabase.table("savings").select("current_amount").eq("id", savings_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Economia não encontrada.")

    new_amount = round(float(current.data[0]["current_amount"]) + payload.amount, 2)
    
    res = supabase.table("savings").update({
        "current_amount": new_amount,
        "updated_at": datetime.now().isoformat()
    }).eq("id", savings_id).eq("user_id", current_user["id"]).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao realizar depósito na economia.")

    return format_savings_item(res.data[0])

@router.post("/{savings_id}/withdraw", response_model=SavingsResponse)
async def withdraw_savings(savings_id: str, payload: SavingsDepositWithdraw, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Resgata um valor da economia de volta para o saldo disponível da conta."""
    supabase = get_supabase()
    
    current = supabase.table("savings").select("current_amount").eq("id", savings_id).eq("user_id", current_user["id"]).limit(1).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Economia não encontrada.")

    current_val = float(current.data[0]["current_amount"])
    if payload.amount > current_val:
        raise HTTPException(status_code=400, detail=f"Valor de resgate maior que o guardado (Disponível: R$ {current_val:.2f}).")

    new_amount = round(current_val - payload.amount, 2)
    
    res = supabase.table("savings").update({
        "current_amount": new_amount,
        "updated_at": datetime.now().isoformat()
    }).eq("id", savings_id).eq("user_id", current_user["id"]).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao realizar resgate da economia.")

    return format_savings_item(res.data[0])

@router.delete("/{savings_id}")
async def delete_savings(savings_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Remove uma economia/meta."""
    supabase = get_supabase()
    res = supabase.table("savings").delete().eq("id", savings_id).eq("user_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Economia não encontrada.")
    return {"message": "Economia removida com sucesso."}

