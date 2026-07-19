import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ ACCOUNTS ============
export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("accounts")
      .select("*")
      .eq("user_id", context.userId)
      .order("nome");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

const AccountInput = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(120),
  tipo: z.string().trim().min(1).max(60),
  saldo_inicial: z.number().min(-1_000_000_000).max(1_000_000_000),
  data_inicial: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  status: z.enum(["ativa", "inativa"]),
});

export const upsertAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => AccountInput.parse(i))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { error } = await context.supabase.from("accounts").upsert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("accounts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ CATEGORIES + SUBCATEGORIES ============
export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [cats, subs] = await Promise.all([
      context.supabase.from("categories").select("*").eq("user_id", context.userId).order("nome"),
      context.supabase.from("subcategories").select("*").eq("user_id", context.userId).order("nome"),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    if (subs.error) throw new Error(subs.error.message);
    return { categories: cats.data ?? [], subcategories: subs.data ?? [] };
  });

const CategoryInput = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(120),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  tipo: z.enum(["Receita", "Despesa", "Ambos"]),
});

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => CategoryInput.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("categories")
      .upsert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("categories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SubcategoryInput = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  nome: z.string().trim().min(1).max(120),
});

export const upsertSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => SubcategoryInput.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("subcategories")
      .upsert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("subcategories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ RECURRENCES ============
const FREQS = ["semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "anual"] as const;

export const listRecurrences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("recurrences")
      .select("*")
      .eq("user_id", context.userId)
      .order("proximo_vencimento");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

const RecurrenceInput = z.object({
  id: z.string().uuid().optional(),
  descricao: z.string().trim().min(1).max(200),
  valor: z.number().positive().max(1_000_000_000),
  tipo: z.enum(["Receita", "Despesa"]),
  category_id: z.string().uuid().nullable(),
  subcategory_id: z.string().uuid().nullable(),
  account_id: z.string().uuid().nullable(),
  forma_pagto: z.string().max(60).nullable(),
  frequencia: z.enum(FREQS),
  proximo_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ativo: z.boolean(),
});

export const upsertRecurrence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => RecurrenceInput.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("recurrences")
      .upsert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRecurrence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("recurrences")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ INSTALLMENTS ============
export const listInstallments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [ins, items] = await Promise.all([
      context.supabase.from("installments").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }),
      context.supabase.from("installment_items").select("*").eq("user_id", context.userId).order("data_prevista"),
    ]);
    if (ins.error) throw new Error(ins.error.message);
    if (items.error) throw new Error(items.error.message);
    return { items: ins.data ?? [], parcels: items.data ?? [] };
  });

const InstallmentInput = z.object({
  descricao: z.string().trim().min(1).max(200),
  valor_total: z.number().positive().max(1_000_000_000),
  qtd_parcelas: z.number().int().min(1).max(360),
  primeira_data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  subcategory_id: z.string().uuid().nullable(),
});

export const createInstallment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => InstallmentInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const valor_parcela = Math.round((data.valor_total / data.qtd_parcelas) * 100) / 100;
    const ins = await supabase
      .from("installments")
      .insert({ ...data, valor_parcela, user_id: userId, status: "ativo" })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);

    const items = [];
    const [y, m, d] = data.primeira_data.split("-").map(Number);
    for (let i = 0; i < data.qtd_parcelas; i++) {
      const dt = new Date(Date.UTC(y, m - 1 + i, d));
      const iso = dt.toISOString().slice(0, 10);
      items.push({
        installment_id: ins.data.id,
        user_id: userId,
        numero: i + 1,
        data_prevista: iso,
        valor: valor_parcela,
        status: "pendente",
      });
    }
    const itemsRes = await supabase.from("installment_items").insert(items);
    if (itemsRes.error) throw new Error(itemsRes.error.message);
    return { ok: true };
  });

export const deleteInstallment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("installments")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setParcelStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pendente", "pago", "antecipado", "cancelado"]),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("installment_items")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
