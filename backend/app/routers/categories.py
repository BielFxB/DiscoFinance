from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends

from app.auth import get_current_user
from app.database import get_supabase
from app.models import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter(prefix="/api/categories", tags=["Categorias"])

@router.get("", response_model=List[CategoryResponse])
async def list_categories(current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()
    res = supabase.table("categories").select("*").eq("user_id", current_user["id"]).order("name").execute()
    data = res.data or []
    return [
        CategoryResponse(
            id=item["id"],
            user_id=item["user_id"],
            name=item["name"],
            color=item["color"],
            icon=item["icon"],
            created_at=str(item.get("created_at"))
        )
        for item in data
    ]

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(payload: CategoryCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()
    name_clean = payload.name.strip()

    # Checar duplicata
    existing = supabase.table("categories").select("id").eq("user_id", current_user["id"]).ilike("name", name_clean).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="Você já possui uma categoria com este nome.")

    res = supabase.table("categories").insert({
        "user_id": current_user["id"],
        "name": name_clean,
        "color": payload.color,
        "icon": payload.icon
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao criar categoria.")

    item = res.data[0]
    return CategoryResponse(
        id=item["id"],
        user_id=item["user_id"],
        name=item["name"],
        color=item["color"],
        icon=item["icon"],
        created_at=str(item.get("created_at"))
    )

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, payload: CategoryUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()
    update_data = {}
    if payload.name is not None:
        update_data["name"] = payload.name.strip()
    if payload.color is not None:
        update_data["color"] = payload.color
    if payload.icon is not None:
        update_data["icon"] = payload.icon

    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo fornecido para atualização.")

    res = supabase.table("categories").update(update_data).eq("id", category_id).eq("user_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    item = res.data[0]
    return CategoryResponse(
        id=item["id"],
        user_id=item["user_id"],
        name=item["name"],
        color=item["color"],
        icon=item["icon"],
        created_at=str(item.get("created_at"))
    )

@router.delete("/{category_id}")
async def delete_category(category_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    supabase = get_supabase()
    res = supabase.table("categories").delete().eq("id", category_id).eq("user_id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    return {"message": "Categoria removida com sucesso."}

