
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT NOT NULL,
  tipo_efetivo TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  categoria TEXT,
  subcategoria TEXT,
  conta TEXT,
  forma_pagto TEXT,
  descricao TEXT,
  status TEXT,
  observacoes TEXT,
  dedupe_hash TEXT NOT NULL,
  source_file TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT transactions_user_dedupe_unique UNIQUE (user_id, dedupe_hash)
);

CREATE INDEX transactions_user_data_idx ON public.transactions (user_id, data DESC);
CREATE INDEX transactions_user_categoria_idx ON public.transactions (user_id, categoria);
CREATE INDEX transactions_user_conta_idx ON public.transactions (user_id, conta);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_transactions" ON public.transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_transactions" ON public.transactions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_transactions" ON public.transactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  rows_invalid INTEGER NOT NULL DEFAULT 0,
  rows_duplicated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX imports_user_created_idx ON public.imports (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.imports TO authenticated;
GRANT ALL ON public.imports TO service_role;

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_imports" ON public.imports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_imports" ON public.imports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_imports" ON public.imports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
