import re
from datetime import datetime, date
from typing import Dict, Any, List
from collections import defaultdict
from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user
from app.database import get_supabase
from app.models import (
    MonthlySummaryResponse,
    CategoryBreakdownItem,
    DailyExpenseItem,
    TransactionResponse
)
from app.routers.transactions import format_transaction_item

router = APIRouter(prefix="/api/analytics", tags=["Métricas e Analytics"])

@router.get("/summary", response_model=MonthlySummaryResponse)
async def get_monthly_summary(
    month: int = Query(default_factory=lambda: datetime.now().month, ge=1, le=12),
    year: int = Query(default_factory=lambda: datetime.now().year, ge=2000, le=2100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()

    first_day = f"{year}-{month:02d}-01"
    next_month = month + 1 if month < 12 else 1
    next_year = year if month < 12 else year + 1
    last_day = f"{next_year}-{next_month:02d}-01"

    # 1. Saldo Inicial e Total Acumulado em Conta
    initial_balance = float(current_user.get("initial_balance", 0.0) or 0.0)

    # Buscar todas as transações da conta para compor o saldo real histórico acumulado
    all_tx_res = supabase.table("transactions") \
        .select("amount, type") \
        .eq("user_id", current_user["id"]) \
        .execute()
    
    all_tx = all_tx_res.data or []
    all_incomes = sum(float(t["amount"]) for t in all_tx if t["type"] == "INCOME")
    all_expenses = sum(float(t["amount"]) for t in all_tx if t["type"] == "EXPENSE")
    gross_balance = initial_balance + all_incomes - all_expenses

    # 2. Buscar total guardado em Economias / Cofrinhos
    savings_res = supabase.table("savings") \
        .select("current_amount") \
        .eq("user_id", current_user["id"]) \
        .execute()
    
    savings_items = savings_res.data or []
    total_saved = sum(float(s["current_amount"]) for s in savings_items)

    # Saldo Real Disponível em Conta (Descontando as economias para gastos futuros!)
    available_balance = gross_balance - total_saved

    # 3. Buscar transações do mês selecionado
    tx_res = supabase.table("transactions") \
        .select("id, user_id, description, amount, type, category_id, date, created_at, categories(name, color, icon)") \
        .eq("user_id", current_user["id"]) \
        .gte("date", first_day) \
        .lt("date", last_day) \
        .order("date", desc=True) \
        .order("created_at", desc=True) \
        .execute()
    
    transactions = tx_res.data or []

    # 4. Buscar gastos fixos ativos
    rec_res = supabase.table("recurring_expenses") \
        .select("id, amount") \
        .eq("user_id", current_user["id"]) \
        .eq("is_active", True) \
        .execute()
    
    recurring = rec_res.data or []

    # Cálculos Totais do Mês
    total_income = sum(float(t["amount"]) for t in transactions if t["type"] == "INCOME")
    total_expenses = sum(float(t["amount"]) for t in transactions if t["type"] == "EXPENSE")
    total_recurring = sum(float(r["amount"]) for r in recurring)

    # Identificar quais gastos fixos já foram pagos neste mês
    paid_rec_ids = set()
    for t in transactions:
        desc = t.get("description", "")
        match = re.search(r"\[Fixo:([a-f0-9\-]+)\]", desc)
        if match:
            paid_rec_ids.add(match.group(1))

    recurring_paid = sum(float(r["amount"]) for r in recurring if r["id"] in paid_rec_ids)
    recurring_pending = max(0.0, total_recurring - recurring_paid)

    net_balance = total_income - total_expenses
    # Projeção do saldo: deduz apenas os gastos fixos que ainda estão PENDENTES no mês
    projected_balance = available_balance - recurring_pending

    budget_usage_percent = 0.0
    if total_income > 0:
        budget_usage_percent = round(((total_expenses + recurring_pending) / total_income) * 100, 1)

    # 5. Breakdown por Categoria (apenas despesas para o gráfico de pizza/rosca)
    cat_totals = defaultdict(lambda: {"total": 0.0, "count": 0, "name": "Outros", "color": "#64748B", "icon": "Tag"})
    for t in transactions:
        if t["type"] == "EXPENSE":
            cat = t.get("categories")
            cat_id = t.get("category_id") or "uncategorized"
            cat_name = cat.get("name") if isinstance(cat, dict) else "Outros"
            cat_color = cat.get("color") if isinstance(cat, dict) else "#64748B"
            cat_icon = cat.get("icon") if isinstance(cat, dict) else "Tag"

            cat_totals[cat_id]["total"] += float(t["amount"])
            cat_totals[cat_id]["count"] += 1
            cat_totals[cat_id]["name"] = cat_name
            cat_totals[cat_id]["color"] = cat_color
            cat_totals[cat_id]["icon"] = cat_icon

    category_breakdown: List[CategoryBreakdownItem] = []
    for cat_id, data in cat_totals.items():
        pct = round((data["total"] / total_expenses * 100), 1) if total_expenses > 0 else 0.0
        category_breakdown.append(
            CategoryBreakdownItem(
                category_id=None if cat_id == "uncategorized" else cat_id,
                category_name=data["name"],
                color=data["color"],
                icon=data["icon"],
                total=round(data["total"], 2),
                count=data["count"],
                percentage=pct
            )
        )
    category_breakdown.sort(key=lambda x: x.total, reverse=True)

    # 6. Histórico Diário de Receitas e Despesas do Mês
    daily_map = defaultdict(lambda: {"expenses": 0.0, "income": 0.0})
    for t in transactions:
        d_str = str(t["date"])
        if t["type"] == "EXPENSE":
            daily_map[d_str]["expenses"] += float(t["amount"])
        else:
            daily_map[d_str]["income"] += float(t["amount"])

    daily_history: List[DailyExpenseItem] = []
    for d_str in sorted(daily_map.keys()):
        daily_history.append(
            DailyExpenseItem(
                date=d_str,
                expenses=round(daily_map[d_str]["expenses"], 2),
                income=round(daily_map[d_str]["income"], 2)
            )
        )

    # 7. Transações recentes (até 5)
    recent_transactions = [format_transaction_item(t) for t in transactions[:5]]

    return MonthlySummaryResponse(
        month=month,
        year=year,
        initial_balance=round(initial_balance, 2),
        gross_balance=round(gross_balance, 2),
        total_saved=round(total_saved, 2),
        available_balance=round(available_balance, 2),
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        total_recurring=round(total_recurring, 2),
        recurring_paid=round(recurring_paid, 2),
        recurring_pending=round(recurring_pending, 2),
        net_balance=round(net_balance, 2),
        projected_balance=round(projected_balance, 2),
        budget_usage_percent=budget_usage_percent,
        category_breakdown=category_breakdown,
        daily_history=daily_history,
        recent_transactions=recent_transactions
    )
