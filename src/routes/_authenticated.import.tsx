import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fixInvalidRow, parseFinanceFile, type ParseResult } from "@/lib/parser";
import { importTransactions } from "@/lib/transactions.functions";
import { fmtBRL } from "@/lib/finance";
import type { ParsedRow, TipoOriginal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, AlertTriangle, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "Importar — Central Financeira" }] }),
  component: ImportPage,
});

type RowState = "erro" | "corrigindo" | "validado";

function stateOf(r: ParsedRow, editing: boolean): RowState {
  if (r.invalid) return editing ? "corrigindo" : "erro";
  return "validado";
}

function ImportPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const importFn = useServerFn(importTransactions);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setParsing(true);
    try {
      const result = await parseFinanceFile(file);
      setParsed(result);
      setEditingIdx(null);
    } catch (e) {
      toast.error("Erro ao ler arquivo: " + (e as Error).message);
    } finally {
      setParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
  });

  const m = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error("Sem dados");
      const valid = parsed.rows.filter((r) => !r.invalid);
      if (!valid.length) throw new Error("Nenhuma linha válida.");
      const payload = valid.map(({ invalid: _i, raw_valor: _r, ...rest }) => rest);
      return importFn({ data: { fileName: parsed.fileName, rows: payload } });
    },
    onSuccess: (res) => {
      toast.success(`Importado: ${res.imported} novos, ${res.duplicated} duplicados ignorados.`);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      navigate({ to: "/" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totals = useMemo(() => {
    if (!parsed) return null;
    return parsed.rows.reduce(
      (a, r) => {
        if (r.invalid) return a;
        if (r.tipo === "Receita") a.rec += r.valor;
        if (r.tipo === "Despesa") a.des += r.valor;
        return a;
      },
      { rec: 0, des: 0 },
    );
  }, [parsed]);

  const counts = useMemo(() => {
    if (!parsed) return { erro: 0, validado: 0 };
    return parsed.rows.reduce(
      (a, r) => {
        if (r.invalid) a.erro++;
        else a.validado++;
        return a;
      },
      { erro: 0, validado: 0 },
    );
  }, [parsed]);

  const updateRow = (idx: number, patch: Partial<ParsedRow>) => {
    if (!parsed) return;
    const rows = [...parsed.rows];
    const merged = { ...rows[idx], ...patch };
    // re-validate
    const issues: string[] = [];
    if (!merged.tipo) issues.push("tipo inválido");
    if (!merged.data) issues.push("data inválida");
    if (!merged.valor || merged.valor <= 0) issues.push("valor inválido");
    if (issues.length === 0) {
      rows[idx] = fixInvalidRow(merged, merged.valor);
    } else {
      rows[idx] = { ...merged, invalid: issues.join(", ") };
    }
    setParsed({ ...parsed, rows, invalidCount: rows.filter((r) => r.invalid).length });
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-gradient-primary">Importar planilha</h1>
        <p className="text-xs text-muted-foreground">CSV ou XLSX no formato Controle_Financeiro. Duplicatas são ignoradas automaticamente.</p>
      </header>

      <div
        {...getRootProps()}
        className={`glass rounded-2xl p-10 border-2 border-dashed cursor-pointer text-center transition ${
          isDragActive ? "border-primary bg-primary/10" : "border-border"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="size-8 mx-auto text-muted-foreground" />
        <p className="mt-3 text-sm">{parsing ? "Lendo arquivo..." : "Arraste um arquivo .csv ou .xlsx ou clique para selecionar"}</p>
      </div>

      {parsed && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Stat label="Arquivo" value={parsed.fileName} />
            <Stat label="Lançamentos" value={String(parsed.totalRows)} />
            <Stat label="Validados" value={String(counts.validado)} tone="success" />
            <Stat label="Com erro" value={String(counts.erro)} tone={counts.erro > 0 ? "warning" : undefined} />
            <Stat label="Receitas" value={fmtBRL(totals?.rec ?? 0)} tone="success" />
            <Stat label="Despesas" value={fmtBRL(totals?.des ?? 0)} tone="warning" />
          </div>

          {parsed.invalidCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[color:var(--warning)]">
                <AlertTriangle className="size-4" /> {parsed.invalidCount} linha(s) precisam de correção. Edite a célula com problema para validar.
              </div>
              <div className="space-y-2 max-h-96 overflow-auto">
                {parsed.rows.map((r, i) => {
                  if (!r.invalid) return null;
                  const editing = editingIdx === i;
                  const st = stateOf(r, editing);
                  return (
                    <div key={i} className={`p-3 rounded-xl border bg-muted/20 ${st === "corrigindo" ? "border-primary" : "border-[color:var(--warning)]/40"}`}>
                      <div className="flex items-center justify-between gap-3 mb-2 text-xs">
                        <StateBadge state={st} />
                        <span className="text-muted-foreground truncate flex-1">
                          Linha {i + 2}: <span className="text-[color:var(--warning)]">{r.invalid}</span>
                          {r.raw_valor && <> · valor original: "{r.raw_valor}"</>}
                        </span>
                        {!editing && (
                          <Button size="sm" variant="outline" className="h-7" onClick={() => setEditingIdx(i)}>
                            <Pencil className="size-3 mr-1" /> Corrigir
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
                        <Field label="Data">
                          <Input value={r.data} disabled={!editing} className="h-8 text-xs"
                            placeholder="YYYY-MM-DD"
                            onChange={(e) => updateRow(i, { data: e.target.value })} />
                        </Field>
                        <Field label="Tipo">
                          <Select value={r.tipo} disabled={!editing}
                            onValueChange={(v) => updateRow(i, { tipo: v as TipoOriginal, tipo_efetivo: v as TipoOriginal })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Receita">Receita</SelectItem>
                              <SelectItem value="Despesa">Despesa</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Valor">
                          <Input type="number" step="0.01" defaultValue={r.valor || ""} disabled={!editing}
                            className="h-8 text-xs"
                            onChange={(e) => updateRow(i, { valor: Number(e.target.value) })} />
                        </Field>
                        <Field label="Categoria">
                          <Input value={r.categoria ?? ""} disabled={!editing} className="h-8 text-xs"
                            onChange={(e) => updateRow(i, { categoria: e.target.value || null })} />
                        </Field>
                        <Field label="Conta">
                          <Input value={r.conta ?? ""} disabled={!editing} className="h-8 text-xs"
                            onChange={(e) => updateRow(i, { conta: e.target.value || null })} />
                        </Field>
                        <Field label="Descrição">
                          <Input value={r.descricao ?? ""} disabled={!editing} className="h-8 text-xs"
                            onChange={(e) => updateRow(i, { descricao: e.target.value || null })} />
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-[color:var(--success)]">
            <CheckCircle2 className="size-4" /> {counts.validado} linha(s) pronta(s) para importar.
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setParsed(null); setEditingIdx(null); }}>Cancelar</Button>
            <Button onClick={() => m.mutate()} disabled={m.isPending || parsed.invalidCount > 0}>
              {m.isPending ? "Importando..." : `Importar ${counts.validado} lançamento(s)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

function StateBadge({ state }: { state: RowState }) {
  const map = {
    erro: { cls: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]", icon: AlertCircle, label: "Erro" },
    corrigindo: { cls: "bg-primary/15 text-primary", icon: Pencil, label: "Corrigindo" },
    validado: { cls: "bg-[color:var(--success)]/15 text-[color:var(--success)]", icon: CheckCircle2, label: "Validado" },
  } as const;
  const { cls, icon: Icon, label } = map[state];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold ${cls}`}>
      <Icon className="size-3" /> {label}
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const cls =
    tone === "success" ? "text-[color:var(--success)]"
    : tone === "warning" ? "text-[color:var(--warning)]"
    : tone === "primary" ? "text-gradient-primary"
    : "";
  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold truncate mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}
