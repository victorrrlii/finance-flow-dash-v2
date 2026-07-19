
-- =========================================
-- ACCOUNTS
-- =========================================
CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'Conta Corrente',
  saldo_inicial numeric NOT NULL DEFAULT 0,
  data_inicial date NOT NULL DEFAULT CURRENT_DATE,
  cor text NOT NULL DEFAULT '#3B82F6',
  status text NOT NULL DEFAULT 'ativa',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own_accounts" ON public.accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_accounts" ON public.accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_accounts" ON public.accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================
-- CATEGORIES
-- =========================================
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#A855F7',
  tipo text NOT NULL DEFAULT 'Ambos',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own_categories" ON public.categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_categories" ON public.categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_categories" ON public.categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================
-- SUBCATEGORIES
-- =========================================
CREATE TABLE public.subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  nome text NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategories TO authenticated;
GRANT ALL ON public.subcategories TO service_role;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own_subcategories" ON public.subcategories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_subcategories" ON public.subcategories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_subcategories" ON public.subcategories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_subcategories" ON public.subcategories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================
-- RECURRENCES
-- =========================================
CREATE TABLE public.recurrences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  descricao text NOT NULL,
  valor numeric NOT NULL,
  tipo text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  forma_pagto text,
  frequencia text NOT NULL,
  proximo_vencimento date NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ultima_geracao date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurrences TO authenticated;
GRANT ALL ON public.recurrences TO service_role;
ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own_recurrences" ON public.recurrences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_recurrences" ON public.recurrences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_recurrences" ON public.recurrences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_recurrences" ON public.recurrences FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================
-- INSTALLMENTS
-- =========================================
CREATE TABLE public.installments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  descricao text NOT NULL,
  valor_total numeric NOT NULL,
  qtd_parcelas integer NOT NULL,
  valor_parcela numeric NOT NULL,
  primeira_data date NOT NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installments TO authenticated;
GRANT ALL ON public.installments TO service_role;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own_installments" ON public.installments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_installments" ON public.installments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_installments" ON public.installments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_installments" ON public.installments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================
-- INSTALLMENT ITEMS
-- =========================================
CREATE TABLE public.installment_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  installment_id uuid NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  data_prevista date NOT NULL,
  valor numeric NOT NULL,
  transaction_id uuid,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (installment_id, numero)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installment_items TO authenticated;
GRANT ALL ON public.installment_items TO service_role;
ALTER TABLE public.installment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own_inst_items" ON public.installment_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_inst_items" ON public.installment_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_inst_items" ON public.installment_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_inst_items" ON public.installment_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================
-- TRANSACTIONS — novas colunas
-- =========================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_id uuid REFERENCES public.recurrences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS installment_item_id uuid REFERENCES public.installment_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_prevista date,
  ADD COLUMN IF NOT EXISTS realizado boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_tx_user_data ON public.transactions(user_id, data);
CREATE INDEX IF NOT EXISTS idx_tx_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_realizado ON public.transactions(user_id, realizado);

-- =========================================
-- BACK-FILL: criar accounts/categories/subcategories a partir das transações já existentes
-- =========================================

-- Accounts
INSERT INTO public.accounts (user_id, nome, tipo, saldo_inicial, data_inicial, cor, status)
SELECT DISTINCT t.user_id, t.conta, 'Conta Corrente', 0, CURRENT_DATE, '#3B82F6', 'ativa'
FROM public.transactions t
WHERE t.conta IS NOT NULL AND t.conta <> ''
ON CONFLICT (user_id, nome) DO NOTHING;

-- Categories
INSERT INTO public.categories (user_id, nome, cor, tipo)
SELECT DISTINCT t.user_id, t.categoria, '#A855F7', 'Ambos'
FROM public.transactions t
WHERE t.categoria IS NOT NULL AND t.categoria <> ''
ON CONFLICT (user_id, nome) DO NOTHING;

-- Subcategories
INSERT INTO public.subcategories (user_id, category_id, nome)
SELECT DISTINCT t.user_id, c.id, t.subcategoria
FROM public.transactions t
JOIN public.categories c ON c.user_id = t.user_id AND c.nome = t.categoria
WHERE t.subcategoria IS NOT NULL AND t.subcategoria <> ''
ON CONFLICT (user_id, category_id, nome) DO NOTHING;

-- Vincular transações às FKs
UPDATE public.transactions t
SET account_id = a.id
FROM public.accounts a
WHERE a.user_id = t.user_id AND a.nome = t.conta AND t.account_id IS NULL;

UPDATE public.transactions t
SET category_id = c.id
FROM public.categories c
WHERE c.user_id = t.user_id AND c.nome = t.categoria AND t.category_id IS NULL;

UPDATE public.transactions t
SET subcategory_id = s.id
FROM public.subcategories s
WHERE s.user_id = t.user_id AND s.nome = t.subcategoria AND s.category_id = t.category_id AND t.subcategory_id IS NULL;

-- =========================================
-- Trigger genérico de updated_at
-- =========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_updated_at_accounts BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_subcategories BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_recurrences BEFORE UPDATE ON public.recurrences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_installments BEFORE UPDATE ON public.installments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
