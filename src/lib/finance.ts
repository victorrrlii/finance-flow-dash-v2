// Helpers de formatação e cálculo financeiro (pt-BR)
import { format, parseISO, startOfMonth, endOfMonth, subMonths, subDays, startOfYear, startOfQuarter } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Transaction } from "./types";

export const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);

export const fmtBRLShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return fmtBRL(n);
};

export const fmtDate = (iso: string) =>
  format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });

export const fmtMonth = (iso: string) =>
  format(parseISO(iso + "-01"), "MMM/yy", { locale: ptBR });

export type PeriodKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "mtd"
  | "qtd"
  | "ytd"
  | "all"
  | "custom";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  mtd: "Mês",
  qtd: "Trimestre",
  ytd: "Ano",
  all: "Tudo",
  custom: "Personalizado",
};

export interface DateRange {
  from: Date;
  to: Date;
}

export function rangeForPeriod(
  period: PeriodKey,
  custom?: DateRange,
  refDate: Date = new Date(),
): DateRange | null {
  switch (period) {
    case "today":
      return { from: startOfDay(refDate), to: endOfDay(refDate) };
    case "yesterday": {
      const y = subDays(refDate, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "7d":
      return { from: startOfDay(subDays(refDate, 6)), to: endOfDay(refDate) };
    case "30d":
      return { from: startOfDay(subDays(refDate, 29)), to: endOfDay(refDate) };
    case "90d":
      return { from: startOfDay(subDays(refDate, 89)), to: endOfDay(refDate) };
    case "mtd":
      return { from: startOfMonth(refDate), to: endOfDay(refDate) };
    case "qtd":
      return { from: startOfQuarter(refDate), to: endOfDay(refDate) };
    case "ytd":
      return { from: startOfYear(refDate), to: endOfDay(refDate) };
    case "all":
      return null;
    case "custom":
      return custom ?? null;
  }
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export interface FilterState {
  period: PeriodKey;
  customRange?: DateRange;
  categoria: string[];
  conta: string[];
  forma_pagto: string[];
  tipo_efetivo: string[];
  status: string[];
}

export const initialFilters: FilterState = {
  period: "all",
  categoria: [],
  conta: [],
  forma_pagto: [],
  tipo_efetivo: [],
  status: [],
};

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function applyFilters(txs: Transaction[], f: FilterState): Transaction[] {
  const range = rangeForPeriod(f.period, f.customRange);
  const fromYMD = range ? toYMD(range.from) : null;
  const toYMD_ = range ? toYMD(range.to) : null;
  return txs.filter((t) => {
    if (fromYMD && toYMD_) {
      // Comparação por string YYYY-MM-DD evita bugs de fuso horário
      const d = t.data.slice(0, 10);
      if (d < fromYMD || d > toYMD_) return false;
    }
    if (f.categoria.length && !f.categoria.includes(t.categoria ?? "—")) return false;
    if (f.conta.length && !f.conta.includes(t.conta ?? "—")) return false;
    if (f.forma_pagto.length && !f.forma_pagto.includes(t.forma_pagto ?? "—")) return false;
    if (f.tipo_efetivo.length && !f.tipo_efetivo.includes(t.tipo_efetivo)) return false;
    if (f.status.length && !f.status.includes(t.status ?? "—")) return false;
    return true;
  });
}

export function uniqueValues<K extends keyof Transaction>(
  txs: Transaction[],
  key: K,
): string[] {
  const s = new Set<string>();
  for (const t of txs) s.add(String(t[key] ?? "—"));
  return Array.from(s).sort();
}

// === KPIs ===
export interface KPIs {
  receitas: number;
  despesas: number;
  saldo: number;
  resultadoMes: number;
  maiorCategoriaGasto: { nome: string; valor: number } | null;
  ticketMedioDespesa: number;
  ticketMedioReceita: number;
  varReceitas: number; // %
  varDespesas: number;
  varSaldo: number;
  countReceitas: number;
  countDespesas: number;
}

// Soma receitas/despesas baseada APENAS na coluna "tipo" do CSV.
function isInflow(t: Transaction) {
  return t.tipo === "Receita";
}
function isOutflow(t: Transaction) {
  return t.tipo === "Despesa";
}

export function computeKPIs(filtered: Transaction[], all: Transaction[]): KPIs {
  const receitas = filtered.filter(isInflow).reduce((s, t) => s + t.valor, 0);
  const despesas = filtered.filter(isOutflow).reduce((s, t) => s + t.valor, 0);
  const saldo = receitas - despesas;

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const prevStart = startOfMonth(subMonths(today, 1));
  const prevEnd = endOfMonth(subMonths(today, 1));

  const sumByRange = (txs: Transaction[], from: Date, to: Date, pred: (t: Transaction) => boolean) =>
    txs
      .filter((t) => {
        const d = parseISO(t.data);
        return pred(t) && d >= from && d <= to;
      })
      .reduce((s, t) => s + t.valor, 0);

  const recMes = sumByRange(all, monthStart, monthEnd, isInflow);
  const desMes = sumByRange(all, monthStart, monthEnd, isOutflow);
  const recPrev = sumByRange(all, prevStart, prevEnd, isInflow);
  const desPrev = sumByRange(all, prevStart, prevEnd, isOutflow);
  const resultadoMes = recMes - desMes;
  const resultadoPrev = recPrev - desPrev;

  const pct = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / b) * 100);

  // Maior categoria de gasto
  const catMap = new Map<string, number>();
  for (const t of filtered.filter(isOutflow)) {
    const k = t.categoria ?? "—";
    catMap.set(k, (catMap.get(k) ?? 0) + t.valor);
  }
  let maiorCat: { nome: string; valor: number } | null = null;
  for (const [nome, valor] of catMap) {
    if (!maiorCat || valor > maiorCat.valor) maiorCat = { nome, valor };
  }

  const inflowList = filtered.filter(isInflow);
  const outflowList = filtered.filter(isOutflow);

  return {
    receitas,
    despesas,
    saldo,
    resultadoMes,
    maiorCategoriaGasto: maiorCat,
    ticketMedioDespesa: outflowList.length ? despesas / outflowList.length : 0,
    ticketMedioReceita: inflowList.length ? receitas / inflowList.length : 0,
    varReceitas: pct(recMes, recPrev),
    varDespesas: pct(desMes, desPrev),
    varSaldo: pct(resultadoMes, resultadoPrev),
    countReceitas: inflowList.length,
    countDespesas: outflowList.length,
  };
}

// === Saldo diário disponível VA — só faz sentido no mês atual ===
export interface SaldoVADiario {
  saldo: number;
  diasRestantes: number;
  diario: number;
  contaNome: string;
}

export function computeSaldoVADiario(
  accounts: { id: string; nome: string; saldo_inicial: number | string; status: string }[],
  allTxs: Transaction[],
  today: Date = new Date(),
): SaldoVADiario | null {
  const va = accounts.find((a) => {
    const n = (a.nome ?? "").trim().toLowerCase();
    return n === "va" || n.includes("va");
  });
  if (!va) return null;
  const nomeLower = (va.nome ?? "").trim().toLowerCase();
  const monthPrefix = toYMD(today).slice(0, 7);
  const todayISO = toYMD(today);
  // Saldo disponível na conta VA no mês atual:
  // saldo_inicial + (receitas - despesas) do mês corrente até hoje na conta VA.
  const inicial = Number(va.saldo_inicial ?? 0);
  let movs = 0;
  for (const t of allTxs) {
    const c = (t.conta ?? "").trim().toLowerCase();
    if (c !== nomeLower) continue;
    const d = t.data.slice(0, 10);
    if (d.slice(0, 7) !== monthPrefix) continue;
    if (d > todayISO) continue;
    if (t.tipo === "Receita") movs += t.valor;
    else if (t.tipo === "Despesa") movs -= t.valor;
  }
  const saldo = inicial + movs;
  const lastDay = endOfMonth(today).getDate();
  const diasRestantes = Math.max(1, lastDay - today.getDate() + 1);
  return { saldo, diasRestantes, diario: saldo / diasRestantes, contaNome: va.nome };
}

// === Séries para gráficos ===
export function evolucaoDiaria(txs: Transaction[]) {
  const map = new Map<string, { receitas: number; despesas: number }>();
  for (const t of txs) {
    const k = t.data;
    const cur = map.get(k) ?? { receitas: 0, despesas: 0 };
    if (isInflow(t)) cur.receitas += t.valor;
    if (isOutflow(t)) cur.despesas += t.valor;
    map.set(k, cur);
  }
  const keys = Array.from(map.keys()).sort();
  let acc = 0;
  return keys.map((k) => {
    const v = map.get(k)!;
    acc += v.receitas - v.despesas;
    return {
      data: k,
      label: format(parseISO(k), "dd/MM", { locale: ptBR }),
      receitas: v.receitas,
      despesas: v.despesas,
      saldo: acc,
    };
  });
}

export function fluxoMensal(txs: Transaction[]) {
  const map = new Map<string, { receitas: number; despesas: number }>();
  for (const t of txs) {
    const k = t.data.slice(0, 7);
    const cur = map.get(k) ?? { receitas: 0, despesas: 0 };
    if (isInflow(t)) cur.receitas += t.valor;
    if (isOutflow(t)) cur.despesas += t.valor;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ mes: k, label: fmtMonth(k), ...v, saldo: v.receitas - v.despesas }));
}

export function despesasPorCategoria(txs: Transaction[]) {
  const map = new Map<string, number>();
  for (const t of txs.filter(isOutflow)) {
    const k = t.categoria ?? "—";
    map.set(k, (map.get(k) ?? 0) + t.valor);
  }
  return Array.from(map.entries())
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function receitasPorCategoria(txs: Transaction[]) {
  const map = new Map<string, number>();
  for (const t of txs.filter(isInflow)) {
    const k = t.categoria ?? "—";
    map.set(k, (map.get(k) ?? 0) + t.valor);
  }
  return Array.from(map.entries())
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function despesasPorForma(txs: Transaction[]) {
  const map = new Map<string, number>();
  for (const t of txs.filter(isOutflow)) {
    const k = t.forma_pagto ?? "—";
    map.set(k, (map.get(k) ?? 0) + t.valor);
  }
  return Array.from(map.entries())
    .map(([forma, valor]) => ({ forma, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function saldoPorConta(txs: Transaction[]) {
  const map = new Map<string, number>();
  for (const t of txs) {
    const k = t.conta ?? "—";
    const cur = map.get(k) ?? 0;
    if (isInflow(t)) map.set(k, cur + t.valor);
    else if (isOutflow(t)) map.set(k, cur - t.valor);
    else map.set(k, cur);
  }
  return Array.from(map.entries())
    .map(([conta, saldo]) => ({ conta, saldo }))
    .sort((a, b) => b.saldo - a.saldo);
}

export function topN(txs: Transaction[], type: "Receita" | "Despesa", n = 10) {
  return [...txs]
    .filter((t) => t.tipo_efetivo === type)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, n);
}

// Média mensal histórica de despesas por categoria (últimos 6 meses fechados)
export function historicalCategoryAvg(all: Transaction[], refDate: Date = new Date()): Map<string, number> {
  const start = startOfMonth(subMonths(refDate, 6));
  const end = endOfMonth(subMonths(refDate, 1));
  const totals = new Map<string, number>();
  const months = new Map<string, Set<string>>();
  for (const t of all) {
    if (t.tipo !== "Despesa") continue;
    const d = parseISO(t.data);
    if (d < start || d > end) continue;
    const k = t.categoria ?? "—";
    totals.set(k, (totals.get(k) ?? 0) + t.valor);
    const mset = months.get(k) ?? new Set<string>();
    mset.add(t.data.slice(0, 7));
    months.set(k, mset);
  }
  const avg = new Map<string, number>();
  for (const [k, v] of totals) {
    const m = months.get(k)?.size ?? 0;
    if (m > 0) avg.set(k, v / m);
  }
  return avg;
}
