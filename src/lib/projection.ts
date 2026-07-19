// Projeção de fluxo de caixa futuro
import { addDays, addMonths, addWeeks, format, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Transaction } from "./types";

export interface Account {
  id: string;
  nome: string;
  saldo_inicial: number;
  data_inicial: string;
  status: string;
  cor?: string;
}

export interface Recurrence {
  id: string;
  descricao: string;
  valor: number;
  tipo: "Receita" | "Despesa";
  frequencia: "semanal" | "quinzenal" | "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";
  proximo_vencimento: string;
  ativo: boolean;
}

export interface InstallmentItem {
  id: string;
  data_prevista: string;
  valor: number;
  status: "pendente" | "pago" | "antecipado" | "cancelado";
}

export function saldoConsolidado(accounts: Account[], txs: Transaction[], today = new Date()) {
  const todayISO = format(today, "yyyy-MM-dd");
  const inicial = accounts
    .filter((a) => a.status === "ativa")
    .reduce((s, a) => s + Number(a.saldo_inicial ?? 0), 0);
  const movs = txs.reduce((s, t) => {
    if (t.data > todayISO) return s;
    if (t.tipo_efetivo === "Receita") return s + t.valor;
    if (t.tipo_efetivo === "Despesa") return s - t.valor;
    return s;
  }, 0);
  return inicial + movs;
}

export function patrimonioEvolucao(accounts: Account[], txs: Transaction[]) {
  const inicial = accounts
    .filter((a) => a.status === "ativa")
    .reduce((s, a) => s + Number(a.saldo_inicial ?? 0), 0);
  const sorted = [...txs].sort((a, b) => a.data.localeCompare(b.data));
  const dayMap = new Map<string, number>();
  for (const t of sorted) {
    const delta = t.tipo_efetivo === "Receita" ? t.valor : t.tipo_efetivo === "Despesa" ? -t.valor : 0;
    dayMap.set(t.data, (dayMap.get(t.data) ?? 0) + delta);
  }
  const keys = Array.from(dayMap.keys()).sort();
  let acc = inicial;
  return keys.map((k) => {
    acc += dayMap.get(k)!;
    return { data: k, label: format(parseISO(k), "dd/MM", { locale: ptBR }), patrimonio: acc };
  });
}

function nextOccurrence(date: Date, freq: Recurrence["frequencia"]): Date {
  switch (freq) {
    case "semanal": return addWeeks(date, 1);
    case "quinzenal": return addWeeks(date, 2);
    case "mensal": return addMonths(date, 1);
    case "bimestral": return addMonths(date, 2);
    case "trimestral": return addMonths(date, 3);
    case "semestral": return addMonths(date, 6);
    case "anual": return addMonths(date, 12);
  }
}

export interface ForecastEvent {
  data: string;
  valor: number;
  tipo: "Receita" | "Despesa";
  descricao: string;
  origem: "recorrencia" | "parcela";
}

export function expandRecurrences(recs: Recurrence[], horizon: Date): ForecastEvent[] {
  const out: ForecastEvent[] = [];
  for (const r of recs) {
    if (!r.ativo) continue;
    let cur = parseISO(r.proximo_vencimento);
    while (isBefore(cur, horizon) || cur.getTime() === horizon.getTime()) {
      out.push({
        data: format(cur, "yyyy-MM-dd"),
        valor: r.valor,
        tipo: r.tipo,
        descricao: r.descricao,
        origem: "recorrencia",
      });
      cur = nextOccurrence(cur, r.frequencia);
    }
  }
  return out;
}

export function pendingParcels(items: InstallmentItem[], horizon: Date): ForecastEvent[] {
  const h = format(horizon, "yyyy-MM-dd");
  return items
    .filter((i) => (i.status === "pendente" || i.status === "antecipado") && i.data_prevista <= h)
    .map((i) => ({
      data: i.data_prevista,
      valor: i.valor,
      tipo: "Despesa" as const,
      descricao: `Parcela`,
      origem: "parcela" as const,
    }));
}

export function buildForecast(
  accounts: Account[],
  txs: Transaction[],
  recs: Recurrence[],
  parcels: InstallmentItem[],
  days: number,
  today = new Date(),
) {
  const horizon = addDays(today, days);
  const events = [
    ...expandRecurrences(recs, horizon),
    ...pendingParcels(parcels, horizon),
  ].filter((e) => parseISO(e.data) >= today);

  const dayMap = new Map<string, { receitas: number; despesas: number }>();
  for (const e of events) {
    const cur = dayMap.get(e.data) ?? { receitas: 0, despesas: 0 };
    if (e.tipo === "Receita") cur.receitas += e.valor;
    else cur.despesas += e.valor;
    dayMap.set(e.data, cur);
  }

  let saldo = saldoConsolidado(accounts, txs, today);
  const keys: string[] = [];
  for (let i = 0; i <= days; i++) keys.push(format(addDays(today, i), "yyyy-MM-dd"));

  const series = keys.map((k) => {
    const v = dayMap.get(k) ?? { receitas: 0, despesas: 0 };
    saldo += v.receitas - v.despesas;
    return {
      data: k,
      label: format(parseISO(k), "dd/MM", { locale: ptBR }),
      receitas: v.receitas,
      despesas: v.despesas,
      saldo,
      negativo: saldo < 0,
    };
  });

  return {
    series,
    eventos: events.sort((a, b) => a.data.localeCompare(b.data)),
    totalReceitas: events.filter((e) => e.tipo === "Receita").reduce((s, e) => s + e.valor, 0),
    totalDespesas: events.filter((e) => e.tipo === "Despesa").reduce((s, e) => s + e.valor, 0),
  };
}
