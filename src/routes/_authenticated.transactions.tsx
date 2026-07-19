import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import { deleteTransaction, deleteTransactionsBulk, listTransactions, updateTipoEfetivo } from "@/lib/transactions.functions";
import { applyFilters, fmtBRL, fmtDate, initialFilters, type FilterState } from "@/lib/finance";
import { TIPO_EFETIVO_OPTIONS, type TipoEfetivo } from "@/lib/types";
import { FilterBar } from "@/components/finance/FilterBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { NewTransactionDialog } from "@/components/finance/NewTransactionDialog";

type ExportPeriod = "current" | "pick" | "6m" | "1y" | "all";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({ meta: [{ title: "Lançamentos — Central Financeira" }] }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listTransactions);
  const updateFn = useServerFn(updateTipoEfetivo);
  const deleteFn = useServerFn(deleteTransaction);

  const { data, isLoading } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchFn() });
  const txs = data?.items ?? [];

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const filtered = useMemo(() => {
    const base = applyFilters(txs, filters);
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(
      (t) =>
        (t.descricao ?? "").toLowerCase().includes(q) ||
        (t.categoria ?? "").toLowerCase().includes(q) ||
        (t.subcategoria ?? "").toLowerCase().includes(q) ||
        (t.conta ?? "").toLowerCase().includes(q),
    );
  }, [txs, filters, search]);

  const paged = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const updateMut = useMutation({
    mutationFn: (v: { id: string; tipo_efetivo: TipoEfetivo }) => updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Lançamento removido.");
    },
  });

  const bulkDeleteFn = useServerFn(deleteTransactionsBulk);
  const bulkDeleteMut = useMutation({
    mutationFn: (v: { scope: "all" | "range"; from?: string; to?: string }) => bulkDeleteFn({ data: v }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(`${r.deleted} lançamento(s) excluído(s).`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const [delMonth, setDelMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>("current");
  const [pickMonth, setPickMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const exportRange = useMemo(() => {
    const now = new Date();
    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    if (exportPeriod === "current") return { from: startOfMonth(now), to: endOfMonth(now) };
    if (exportPeriod === "pick") {
      const [y, m] = pickMonth.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      return { from: startOfMonth(d), to: endOfMonth(d) };
    }
    if (exportPeriod === "6m") {
      const from = new Date(now); from.setMonth(now.getMonth() - 6);
      return { from, to: now };
    }
    if (exportPeriod === "1y") {
      const from = new Date(now); from.setFullYear(now.getFullYear() - 1);
      return { from, to: now };
    }
    return null;
  }, [exportPeriod, pickMonth]);

  const exportData = useMemo(() => {
    if (!exportRange) return filtered;
    return filtered.filter((t) => {
      const d = new Date(t.data);
      return d >= exportRange.from && d <= exportRange.to;
    });
  }, [filtered, exportRange]);

  const exportCSV = () => {
    const headers = ["Data", "Tipo", "Tipo Efetivo", "Valor", "Categoria", "Subcategoria", "Conta", "Forma Pagto", "Descrição", "Status", "Observações"];
    const rows = exportData.map((t) => [t.data, t.tipo, t.tipo_efetivo, t.valor, t.categoria, t.subcategoria, t.conta, t.forma_pagto, t.descricao, t.status, t.observacoes]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadBlob(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), `lancamentos-${exportPeriod}.csv`);
    toast.success(`${exportData.length} lançamento(s) exportado(s).`);
  };
  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    XLSX.writeFile(wb, `lancamentos-${exportPeriod}.xlsx`);
    toast.success(`${exportData.length} lançamento(s) exportado(s).`);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gradient-primary">Lançamentos</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <NewTransactionDialog />
          <Select value={exportPeriod} onValueChange={(v) => setExportPeriod(v as ExportPeriod)}>
            <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Mês atual</SelectItem>
              <SelectItem value="pick">Escolher mês</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="1y">Último 1 ano</SelectItem>
              <SelectItem value="all">Todos os dados</SelectItem>
            </SelectContent>
          </Select>
          {exportPeriod === "pick" && (() => {
            const [yy, mm] = pickMonth.split("-");
            const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
            const anoAtual = new Date().getFullYear();
            const anos = Array.from({ length: 8 }, (_, i) => String(anoAtual - i));
            return (
              <div className="flex gap-1">
                <Select value={mm} onValueChange={(v) => setPickMonth(`${yy}-${v}`)}>
                  <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {meses.map((nome, i) => {
                      const val = String(i + 1).padStart(2, "0");
                      return <SelectItem key={val} value={val} className="text-xs">{nome}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Select value={yy} onValueChange={(v) => setPickMonth(`${v}-${mm}`)}>
                  <SelectTrigger className="h-9 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {anos.map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            );
          })()}
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1"><Download className="size-3" /> CSV ({exportData.length})</Button>
          <Button variant="outline" size="sm" onClick={exportXLSX} className="gap-1"><Download className="size-3" /> XLSX</Button>

          {/* Delete by month */}
          <AlertDialog>
            <div className="flex gap-1 items-center">
              <input
                type="month"
                value={delMonth}
                onChange={(e) => setDelMonth(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-xs"
              />
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1" disabled={!delMonth}>
                  <Trash2 className="size-3" /> Excluir mês
                </Button>
              </AlertDialogTrigger>
            </div>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-destructive" /> Excluir lançamentos do mês</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação removerá permanentemente todos os lançamentos de <strong>{delMonth}</strong>. Não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const [y, m] = delMonth.split("-").map(Number);
                    const from = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
                    const last = new Date(y, m, 0).getDate();
                    const to = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
                    bulkDeleteMut.mutate({ scope: "range", from, to });
                  }}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete all */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1">
                <Trash2 className="size-3" /> Excluir todos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-destructive" /> Excluir TODOS os lançamentos</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação removerá permanentemente <strong>todos os lançamentos</strong> da sua conta. Não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => bulkDeleteMut.mutate({ scope: "all" })}>
                  Excluir tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>


      <FilterBar txs={txs} filters={filters} onChange={(f) => { setFilters(f); setPage(0); }} />

      <div className="glass rounded-2xl p-3 space-y-3">
        <Input placeholder="Buscar por descrição, categoria, conta..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="max-w-sm" />

        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDate(t.data)}</TableCell>
                    <TableCell>
                      <Select value={t.tipo_efetivo} onValueChange={(v) => updateMut.mutate({ id: t.id, tipo_efetivo: v as TipoEfetivo })}>
                        <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIPO_EFETIVO_OPTIONS.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={`text-right font-semibold text-xs ${t.tipo_efetivo === "Receita" ? "text-[color:var(--success)]" : t.tipo_efetivo === "Despesa" ? "text-[color:var(--warning)]" : ""}`}>
                      {fmtBRL(t.valor)}
                    </TableCell>
                    <TableCell className="text-xs">{t.categoria}{t.subcategoria ? <span className="text-muted-foreground"> · {t.subcategoria}</span> : null}</TableCell>
                    <TableCell className="text-xs">{t.conta}</TableCell>
                    <TableCell className="text-xs">{t.forma_pagto}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{t.descricao}</TableCell>
                    <TableCell className="text-xs">{t.status}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => deleteMut.mutate(t.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paged.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">Nenhum lançamento.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
