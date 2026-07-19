import { useEffect, useMemo, useState } from "react";
import type { FilterState, PeriodKey } from "@/lib/finance";
import { PERIOD_LABELS } from "@/lib/finance";
import type { Transaction } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";

const PERIODS: PeriodKey[] = ["today", "yesterday", "7d", "30d", "90d", "mtd", "qtd", "ytd", "all"];

function toBR(d?: Date) {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  return `${dd}/${mm}/${yyyy}`;
}
function fromBR(s: string, endOfDay = false): Date | undefined {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd), mo = Number(mm), y = Number(yyyy);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900) return undefined;
  return new Date(y, mo - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
}

export function FilterBar({
  txs,
  filters,
  onChange,
}: {
  txs: Transaction[];
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const [fromText, setFromText] = useState(() => toBR(filters.customRange?.from));
  const [toText, setToText] = useState(() => toBR(filters.customRange?.to));
  useEffect(() => { setFromText(toBR(filters.customRange?.from)); }, [filters.customRange?.from]);
  useEffect(() => { setToText(toBR(filters.customRange?.to)); }, [filters.customRange?.to]);

  const opts = useMemo(() => {
    const get = (key: keyof Transaction) => {
      const s = new Set<string>();
      for (const t of txs) s.add(String(t[key] ?? "—"));
      return Array.from(s).sort();
    };
    return {
      categoria: get("categoria"),
      conta: get("conta"),
      forma_pagto: get("forma_pagto"),
      tipo_efetivo: get("tipo_efetivo"),
      status: get("status"),
    };
  }, [txs]);

  const setMulti = (k: keyof FilterState, vals: string[]) =>
    onChange({ ...filters, [k]: vals });

  const setCustomDate = (which: "from" | "to", v: string) => {
    const today = new Date();
    const curFrom = filters.customRange?.from ?? new Date(today.getFullYear(), today.getMonth(), 1);
    const curTo = filters.customRange?.to ?? today;
    const parsed = fromBR(v, which === "to");
    if (!parsed) {
      // ainda digitando — não atualiza filtro até completar dd/mm/yyyy
      return;
    }
    const next = which === "from" ? { from: parsed, to: curTo } : { from: curFrom, to: parsed };
    onChange({ ...filters, period: "custom", customRange: next });
  };

  const activeCount =
    filters.categoria.length +
    filters.conta.length +
    filters.forma_pagto.length +
    filters.tipo_efetivo.length +
    filters.status.length +
    (filters.period !== "all" ? 1 : 0);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass rounded-2xl p-3 sticky top-3 z-20 space-y-2 transition-all">
      {/* compact trigger bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-semibold hover:text-primary transition-colors text-foreground select-none"
        >
          <SlidersHorizontal className="size-4 opacity-70" />
          <span>Filtros</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="px-2 py-0.5 text-[10px] rounded-full">
              {activeCount} ativo{activeCount > 1 ? "s" : ""}
            </Badge>
          )}
          {isOpen ? (
            <ChevronUp className="size-3.5 opacity-60" />
          ) : (
            <ChevronDown className="size-3.5 opacity-60" />
          )}
        </button>

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() =>
              onChange({ period: "all", categoria: [], conta: [], forma_pagto: [], tipo_efetivo: [], status: [] })
            }
          >
            <X className="size-3" /> Limpar ({activeCount})
          </Button>
        )}
      </div>

      {/* Expanded filters panel */}
      {isOpen && (
        <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => onChange({ ...filters, period: p })}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  filters.period === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    filters.period === "custom"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Personalizado
                  {filters.period === "custom" && filters.customRange && (
                    <span className="ml-1 opacity-80">
                      {toBR(filters.customRange.from)} → {toBR(filters.customRange.to)}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3 space-y-2">
                <div className="text-xs font-semibold mb-1">Período personalizado</div>
                <label className="text-[11px] text-muted-foreground block">
                  De
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    value={fromText}
                    onChange={(e) => { setFromText(e.target.value); setCustomDate("from", e.target.value); }}
                    className="w-full mt-1 px-2 py-1.5 rounded-md bg-background border border-border text-xs"
                  />
                </label>
                <label className="text-[11px] text-muted-foreground block">
                  Até
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    value={toText}
                    onChange={(e) => { setToText(e.target.value); setCustomDate("to", e.target.value); }}
                    className="w-full mt-1 px-2 py-1.5 rounded-md bg-background border border-border text-xs"
                  />
                </label>
                {filters.period === "custom" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onChange({ ...filters, period: "all", customRange: undefined })}
                  >
                    Limpar período
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <div className="h-5 w-px bg-border mx-1" />
          <MultiSelect label="Categoria" options={opts.categoria} value={filters.categoria} onChange={(v) => setMulti("categoria", v)} />
          <MultiSelect label="Conta" options={opts.conta} value={filters.conta} onChange={(v) => setMulti("conta", v)} />
          <MultiSelect label="Forma" options={opts.forma_pagto} value={filters.forma_pagto} onChange={(v) => setMulti("forma_pagto", v)} />
          <MultiSelect label="Tipo" options={opts.tipo_efetivo} value={filters.tipo_efetivo} onChange={(v) => setMulti("tipo_efetivo", v)} />
          <MultiSelect label="Status" options={opts.status} value={filters.status} onChange={(v) => setMulti("status", v)} />
        </div>
      )}
    </div>
  );
}

function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1">
          {label}
          {value.length > 0 && <Badge variant="secondary" className="ml-1">{value.length}</Badge>}
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1 max-h-72 overflow-auto">
        {options.length === 0 && <div className="text-xs text-muted-foreground p-2">Sem opções</div>}
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              onClick={() => toggle(o)}
              className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-muted text-left"
            >
              <span className="truncate">{o}</span>
              {on && <Check className="size-3 text-[color:var(--success)]" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
