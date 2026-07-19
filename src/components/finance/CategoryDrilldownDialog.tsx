import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fmtBRL, fmtDate } from "@/lib/finance";
import type { Transaction } from "@/lib/types";
import { TrendingUp, TrendingDown } from "lucide-react";

export function CategoryDrilldownDialog({
  categoria,
  txs,
  historicalAvg,
  onOpenChange,
}: {
  categoria: string | null;
  txs: Transaction[];
  historicalAvg?: number;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!categoria;
  const items = useMemo(() => {
    if (!categoria) return [];
    return txs
      .filter((t) => t.tipo === "Despesa" && (t.categoria ?? "—") === categoria)
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [txs, categoria]);

  const total = items.reduce((s, t) => s + t.valor, 0);
  const deltaPct = historicalAvg && historicalAvg > 0 ? ((total - historicalAvg) / historicalAvg) * 100 : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {categoria}
            {deltaPct !== null && Math.abs(deltaPct) >= 10 && (
              <Badge variant={deltaPct > 0 ? "destructive" : "secondary"} className="gap-1">
                {deltaPct > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {deltaPct > 0 ? "+" : ""}
                {deltaPct.toFixed(0)}% vs média histórica
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {items.length} lançamento(s) · Total {fmtBRL(total)}
            {historicalAvg ? ` · Média histórica ${fmtBRL(historicalAvg)}/mês` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto space-y-1 pr-1">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma transação no período.</p>
          )}
          {items.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 py-2 px-2 rounded-lg hover:bg-muted/40 text-xs border-b border-border/40">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{t.descricao || t.subcategoria || "—"}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {fmtDate(t.data)} · {t.conta} · {t.forma_pagto}
                </div>
              </div>
              <div className="font-semibold text-[color:var(--warning)] whitespace-nowrap">{fmtBRL(t.valor)}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
