-- ==============================================================================
-- SCHEMA SUPABASE / POSTGRESQL - DISC FINANCI (SISTEMA DE FINANÇAS PESSOAIS)
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Usuários (multi-inquilino / multiusuário)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Saldo que o usuário já tinha em conta
    discord_id VARCHAR(64) UNIQUE,
    discord_link_token VARCHAR(32) UNIQUE,
    discord_link_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir coluna initial_balance em bases existentes
ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- 3. Tabela de Categorias
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#64748B', -- Código hexadecimal (ex: #10B981)
    icon VARCHAR(50) NOT NULL DEFAULT 'Tag',      -- Nome do ícone Lucide (ex: 'Utensils', 'Car')
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_categories_user_name UNIQUE (user_id, name)
);

-- 4. Tabela de Gastos Fixos (Despesas Recorrentes Mensais)
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description VARCHAR(200) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    due_day INT NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Transações (Gastos Variáveis / Entradas / Saídas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('EXPENSE', 'INCOME');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    type transaction_type NOT NULL DEFAULT 'EXPENSE',
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Economias / Cofrinho / Gastos Futuros (Separado do Saldo Disponível em Conta)
CREATE TABLE IF NOT EXISTS savings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (current_amount >= 0),
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    icon VARCHAR(50) NOT NULL DEFAULT 'PiggyBank',
    target_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_discord_link_token ON users(discord_link_token);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_cat ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date ON transactions(user_id, type, date DESC);
CREATE INDEX IF NOT EXISTS idx_savings_user ON savings(user_id);

-- 8. Função e Trigger para Inserir Categorias Padrão para Novos Usuários
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO categories (user_id, name, color, icon) VALUES
        (NEW.id, 'Alimentação', '#EF4444', 'Utensils'),
        (NEW.id, 'Transporte', '#F59E0B', 'Car'),
        (NEW.id, 'Moradia', '#3B82F6', 'Home'),
        (NEW.id, 'Saúde', '#10B981', 'HeartPulse'),
        (NEW.id, 'Lazer', '#8B5CF6', 'Gamepad2'),
        (NEW.id, 'Educação', '#EC4899', 'GraduationCap'),
        (NEW.id, 'Salário', '#14B8A6', 'Briefcase'),
        (NEW.id, 'Investimentos', '#6366F1', 'TrendingUp'),
        (NEW.id, 'Outros', '#64748B', 'HelpCircle')
    ON CONFLICT (user_id, name) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_default_categories ON users;
CREATE TRIGGER trg_create_default_categories
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_categories();

-- 9. Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can manage their own profile" 
    ON users FOR ALL 
    USING (auth.uid() = id OR current_setting('request.jwt.claim.sub', true) = id::text)
    WITH CHECK (auth.uid() = id OR current_setting('request.jwt.claim.sub', true) = id::text);

CREATE POLICY "Users can manage their own categories" 
    ON categories FOR ALL 
    USING (user_id = auth.uid() OR current_setting('request.jwt.claim.sub', true) = user_id::text)
    WITH CHECK (user_id = auth.uid() OR current_setting('request.jwt.claim.sub', true) = user_id::text);

CREATE POLICY "Users can manage their own recurring expenses" 
    ON recurring_expenses FOR ALL 
    USING (user_id = auth.uid() OR current_setting('request.jwt.claim.sub', true) = user_id::text)
    WITH CHECK (user_id = auth.uid() OR current_setting('request.jwt.claim.sub', true) = user_id::text);

CREATE POLICY "Users can manage their own transactions" 
    ON transactions FOR ALL 
    USING (user_id = auth.uid() OR current_setting('request.jwt.claim.sub', true) = user_id::text)
    WITH CHECK (user_id = auth.uid() OR current_setting('request.jwt.claim.sub', true) = user_id::text);

CREATE POLICY "Users can manage their own savings" 
    ON savings FOR ALL 
    USING (user_id = auth.uid() OR current_setting('request.jwt.claim.sub', true) = user_id::text)
    WITH CHECK (user_id = auth.uid() OR current_setting('request.jwt.claim.sub', true) = user_id::text);

-- ==============================================================================
-- MIGRATION SCRIPT (Para quem já rodou a versão anterior no Supabase)
-- ==============================================================================
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
-- CREATE TABLE IF NOT EXISTS savings (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     name VARCHAR(150) NOT NULL,
--     target_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
--     current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (current_amount >= 0),
--     color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
--     icon VARCHAR(50) NOT NULL DEFAULT 'PiggyBank',
--     target_date DATE,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS idx_savings_user ON savings(user_id);
-- ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage their own savings" ON savings FOR ALL 
--   USING (user_id = auth.uid() OR current_setting('request.jwt.claim.sub', true) = user_id::text)
--   WITH CHECK (user_id = auth.uid() OR current_setting('request.jwt.claim.sub', true) = user_id::text);
