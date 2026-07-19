import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Transaction, TipoEfetivo } from "./types";

const ParsedRowSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(["Receita", "Despesa"]),
  tipo_efetivo: z.enum(["Receita", "Despesa", "Transferência", "Investimento"]),
  valor: z.number().positive().max(1_000_000_000),
  categoria: z.string().max(120).nullable(),
  subcategoria: z.string().max(120).nullable(),
  conta: z.string().max(120).nullable(),
  forma_pagto: z.string().max(120).nullable(),
  descricao: z.string().max(500).nullable(),
  status: z.string().max(60).nullable(),
  observacoes: z.string().max(1000).nullable(),
  dedupe_hash: z.string().min(1).max(64),
});

export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: Transaction[] }> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, data, tipo, tipo_efetivo, valor, categoria, subcategoria, conta, forma_pagto, descricao, status, observacoes, source_file, imported_at",
      )
      .eq("user_id", userId)
      .order("data", { ascending: false })
      .limit(10000);
    if (error) throw new Error(error.message);
    return {
      items: (data ?? []).map((r) => ({
        ...r,
        valor: Number(r.valor),
        tipo: r.tipo as "Receita" | "Despesa",
        tipo_efetivo: r.tipo_efetivo as TipoEfetivo,
      })) as Transaction[],
    };
  });

export const importTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        fileName: z.string().min(1).max(255),
        rows: z.array(ParsedRowSchema).min(1).max(5000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const payload = data.rows.map((r) => ({
      ...r,
      user_id: userId,
      source_file: data.fileName,
    }));

    // Insert ignoring duplicates (unique (user_id, dedupe_hash))
    const { data: inserted, error } = await supabase
      .from("transactions")
      .upsert(payload, {
        onConflict: "user_id,dedupe_hash",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) throw new Error(error.message);

    const importedCount = inserted?.length ?? 0;
    const duplicated = data.rows.length - importedCount;

    const { error: importErr } = await supabase.from("imports").insert({
      user_id: userId,
      file_name: data.fileName,
      rows_imported: importedCount,
      rows_invalid: 0,
      rows_duplicated: duplicated,
    });
    if (importErr) console.error("import log error", importErr);

    return { imported: importedCount, duplicated, total: data.rows.length };
  });

const ManualInput = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(["Receita", "Despesa"]),
  tipo_efetivo: z.enum(["Receita", "Despesa", "Transferência", "Investimento"]),
  valor: z.number().positive().max(1_000_000_000),
  categoria: z.string().trim().max(120).nullable(),
  subcategoria: z.string().trim().max(120).nullable(),
  conta: z.string().trim().max(120).nullable(),
  forma_pagto: z.string().trim().max(120).nullable(),
  descricao: z.string().trim().min(1).max(500),
  status: z.string().trim().max(60).nullable(),
  observacoes: z.string().trim().max(1000).nullable(),
  account_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  subcategory_id: z.string().uuid().nullable(),
  realizado: z.boolean(),
});

export const createTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ManualInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const dedupe_hash = `manual-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const { error } = await supabase.from("transactions").insert({
      ...data,
      user_id: userId,
      dedupe_hash,
      source_file: "manual",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTipoEfetivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        tipo_efetivo: z.enum(["Receita", "Despesa", "Transferência", "Investimento"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("transactions")
      .update({ tipo_efetivo: data.tipo_efetivo })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTransactionsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        scope: z.enum(["all", "range"]),
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase.from("transactions").delete({ count: "exact" }).eq("user_id", userId);
    if (data.scope === "range") {
      if (!data.from || !data.to) throw new Error("Período obrigatório.");
      q = q.gte("data", data.from).lte("data", data.to);
    }
    const { error, count } = await q;
    if (error) throw new Error(error.message);
    return { ok: true, deleted: count ?? 0 };
  });
