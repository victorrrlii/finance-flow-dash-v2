import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtBRL } from "@/lib/finance";
import type { Transaction } from "@/lib/types";

interface DayBucket {
  receitas: number;
  despesas: number;
  count: number;
  items: Transaction[];
}

export function FinancialCalendar({ txs }: { txs: Transaction[] }) {
  const initial = useMemo(() => {
    if (txs.length === 0) return new Date();
    // pick the month of the most recent transaction in the filtered set
    const max = txs.reduce((m, t) => (t.data > m ? t.data : m), txs[0].data);
    return parseISO(max);
  }, [txs]);
  const [cursor, setCursor] = useState<Date>(initial);
  const [selected, setSelected] = useState<string | null>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const buckets = useMemo(() => {
    const map = new Map<string, DayBucket>();
    for (const t of txs) {
      const k = t.data.slice(0, 10);
      if (k < format(monthStart, "yyyy-MM-dd") || k > format(monthEnd, "yyyy-MM-dd")) continue;
      const cur = map.get(k) ?? { receitas: 0, despesas: 0, count: 0, items: [] };
      cur.count += 1;
      cur.items.push(t);
      if (t.tipo === "Receita") cur.receitas += t.valor;
      else if (t.tipo === "Despesa") cur.despesas += t.valor;
      map.set(k, cur);
    }
    return map;
  }, [txs, monthStart, monthEnd]);

  const selectedBucket = selected ? buckets.get(selected) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="ghost" onClick={() => setCursor(subMonths(cursor, 1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="text-sm font-semibold capitalize">
          {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
        </div>
        <Button size="icon" variant="ghost" onClick={() => setCursor(addMonths(cursor, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const k = format(d, "yyyy-MM-dd");
          const b = buckets.get(k);
          const inMonth = isSameMonth(d, cursor);
          const isSel = selected === k;
          return (
            <button
              key={k}
              onClick={() => setSelected(isSel ? null : k)}
              className={[
                "min-h-[68px] rounded-lg p-1.5 text-left text-[10px] border transition flex flex-col",
                inMonth ? "border-border bg-card/40 hover:bg-card/70" : "border-transparent bg-transparent opacity-40",
                isSel ? "ring-2 ring-[color:var(--primary)]" : "",
                isToday(d) ? "border-[color:var(--primary)]" : "",
              ].join(" ")}
            >
              <div className="text-[11px] font-semibold">{format(d, "d")}</div>
              {b && (
                <div className="mt-auto space-y-0.5">
                  {b.receitas > 0 && (
                    <div className="text-[9px] text-[color:var(--success)] truncate">+{fmtBRL(b.receitas)}</div>
                  )}
                  {b.despesas > 0 && (
                    <div className="text-[9px] text-[color:var(--warning)] truncate">-{fmtBRL(b.despesas)}</div>
                  )}
                  <div className="text-[9px] text-muted-foreground">{b.count} lanç.</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedBucket && (
        <div className="border-t border-border pt-3 mt-2">
          <div className="text-xs font-semibold mb-2">
            {format(parseISO(selected!), "dd 'de' MMMM", { locale: ptBR })} — {selectedBucket.count} lançamento(s)
          </div>
          <div className="max-h-48 overflow-auto space-y-1">
            {selectedBucket.items.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-[11px] py-1 border-b border-border/40">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground shrink-0">{t.categoria ?? "—"}</span>
                  <span className="truncate">{t.descricao ?? "—"}</span>
                </div>
                <span className={`font-semibold shrink-0 ml-2 ${t.tipo === "Receita" ? "text-[color:var(--success)]" : t.tipo === "Despesa" ? "text-[color:var(--warning)]" : ""}`}>
                  {t.tipo === "Receita" ? "+" : t.tipo === "Despesa" ? "-" : ""}{fmtBRL(t.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
