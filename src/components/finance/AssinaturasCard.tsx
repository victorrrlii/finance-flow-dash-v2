import { useMemo } from "react";
import { Repeat } from "lucide-react";
import { fmtBRL } from "@/lib/finance";
import type { Transaction } from "@/lib/types";

const SUBCAT_KEYS = ["mensalidade", "assinatura"];

function isAssinatura(t: Transaction) {
  const s = (t.subcategoria ?? "").trim().toLowerCase();
  if (!s) return false;
  return SUBCAT_KEYS.some((k) => s.includes(k));
}

export function AssinaturasCard({ txs }: { txs: Transaction[] }) {
  const { total, items, count } = useMemo(() => {
    const sel = txs.filter((t) => t.tipo === "Despesa" && isAssinatura(t));
    const map = new Map<string, { valor: number; count: number }>();
    for (const t of sel) {
      const k = (t.descricao ?? "").trim() || (t.subcategoria ?? "—").trim() || "—";
      const cur = map.get(k) ?? { valor: 0, count: 0 };
      cur.valor += t.valor;
      cur.count += 1;
      map.set(k, cur);
    }
    const items = Array.from(map.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.valor - a.valor);
    const total = items.reduce((s, x) => s + x.valor, 0);
    return { total, items, count: sel.length };
  }, [txs]);

  return (
    <div className="glass rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5"><Repeat className="size-4" /> Gastos em assinaturas</span>
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-[color:var(--warning)]">{fmtBRL(total)}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{count} lançamento(s) · mensalidade + assinatura</div>
      {items.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {items.map((it) => {
            const pct = total > 0 ? (it.valor / total) * 100 : 0;
            return (
              <div key={it.nome}>
                <div className="flex items-center justify-between text-[11px] gap-2">
                  <span className="truncate" title={it.nome}>
                    {it.nome}
                    {it.count > 1 && (
                      <span className="text-muted-foreground ml-1">×{it.count}</span>
                    )}
                  </span>
                  <span className="text-muted-foreground shrink-0">{fmtBRL(it.valor)}</span>
                </div>
                <div className="h-1 rounded-full bg-muted/40 overflow-hidden mt-0.5">
                  <div className="h-full bg-[color:var(--warning)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {items.length === 0 && (
        <p className="text-[11px] text-muted-foreground mt-2">Nenhuma assinatura/mensalidade no período.</p>
      )}
    </div>
  );
}
