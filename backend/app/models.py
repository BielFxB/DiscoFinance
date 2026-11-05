from datetime import date as dt_date, datetime as dt_datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, EmailStr, Field

# ----------------- Auth Schemas -----------------
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    initial_balance: float = Field(default=0.0, ge=0)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    initial_balance: float = 0.0
    discord_id: Optional[str] = None
    is_discord_linked: bool = False
    created_at: Optional[str] = None

class UserBalanceUpdate(BaseModel):
    balance: Optional[float] = None
    initial_balance: Optional[float] = None
    mode: Optional[str] = "available"

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DiscordLinkTokenResponse(BaseModel):
    token: str
    expires_at: str
    instructions: str

# ----------------- Category Schemas -----------------
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    color: str = Field(default="#64748B", pattern=r"^#[0-9a-fA-F]{6}$")
    icon: str = Field(default="Tag", max_length=50)

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    icon: Optional[str] = Field(None, max_length=50)

class CategoryResponse(CategoryBase):
    id: str
    user_id: str
    created_at: Optional[str] = None

# ----------------- Recurring Expense Schemas -----------------
class RecurringCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0)
    due_day: int = Field(..., ge=1, le=31)
    category_id: Optional[str] = None
    is_active: bool = True

class RecurringUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[float] = Field(None, gt=0)
    due_day: Optional[int] = Field(None, ge=1, le=31)
    category_id: Optional[str] = None
    is_active: Optional[bool] = None

class RecurringResponse(BaseModel):
    id: str
    user_id: str
    description: str
    amount: float
    due_day: int
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    is_active: bool
    is_paid: bool = False
    paid_date: Optional[str] = None
    paid_transaction_id: Optional[str] = None
    created_at: Optional[str] = None

class RecurringPayRequest(BaseModel):
    month: Optional[int] = None
    year: Optional[int] = None
    date: Optional[dt_date] = None

# ----------------- Transaction Schemas -----------------
class TransactionCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=255)
    amount: float = Field(..., gt=0)
    type: Literal["EXPENSE", "INCOME"] = "EXPENSE"
    category_id: Optional[str] = None
    date: dt_date = Field(default_factory=dt_date.today)

class TransactionUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[Literal["EXPENSE", "INCOME"]] = None
    category_id: Optional[str] = None
    date: Optional[dt_date] = None

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    description: str
    amount: float
    type: Literal["EXPENSE", "INCOME"]
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    date: str
    is_recurring: bool = False
    recurring_expense_id: Optional[str] = None
    created_at: Optional[str] = None

class QuickParseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=300)
    auto_save: bool = False

class QuickParseResult(BaseModel):
    description: str
    amount: float
    type: Literal["EXPENSE", "INCOME"]
    category_hint: Optional[str] = None
    category_id: Optional[str] = None
    date: str
    saved: bool = False
    transaction: Optional[TransactionResponse] = None

# ----------------- Savings / Cofrinho Schemas -----------------
class SavingsCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    target_amount: float = Field(default=0.0, ge=0)
    current_amount: float = Field(default=0.0, ge=0)
    color: str = Field(default="#3B82F6", pattern=r"^#[0-9a-fA-F]{6}$")
    icon: str = Field(default="PiggyBank", max_length=50)
    target_date: Optional[dt_date] = None

class SavingsUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    target_amount: Optional[float] = Field(None, ge=0)
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    target_date: Optional[dt_date] = None

class SavingsDepositWithdraw(BaseModel):
    amount: float = Field(..., gt=0)

class SavingsResponse(BaseModel):
    id: str
    user_id: str
    name: str
    target_amount: float
    current_amount: float
    percentage: float = 0.0
    color: str
    icon: str
    target_date: Optional[str] = None
    created_at: Optional[str] = None

# ----------------- Analytics Schemas -----------------
class CategoryBreakdownItem(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    color: str
    icon: str
    total: float
    count: int
    percentage: float

class DailyExpenseItem(BaseModel):
    date: str
    expenses: float
    income: float

class MonthlySummaryResponse(BaseModel):
    month: int
    year: int
    initial_balance: float        # Saldo que já existia na conta
    gross_balance: float          # Saldo acumulado (initial_balance + todas_entradas - todas_saidas)
    total_saved: float            # Total guardado em economias/metas (separado)
    available_balance: float      # Saldo real disponível em conta (gross_balance - total_saved)
    total_income: float
    total_expenses: float
    total_recurring: float
    recurring_paid: float = 0.0          # Total de gastos fixos já pagos no mês
    recurring_pending: float = 0.0       # Total de gastos fixos ainda pendentes no mês
    net_balance: float            # total_income - total_expenses no mês
    projected_balance: float      # available_balance - total_recurring
    budget_usage_percent: float   # (total_expenses + total_recurring) / total_income * 100
    category_breakdown: List[CategoryBreakdownItem]
    daily_history: List[DailyExpenseItem]
    recent_transactions: List[TransactionResponse]

