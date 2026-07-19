// Insights financeiros: score de saúde, indicadores comportamentais e alertas
import { differenceInCalendarDays, endOfMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import type { Transaction } from "./types";

const isInflow = (t: Transaction) => t.tipo === "Receita";
const isOutflow = (t: Transaction) => t.tipo === "Despesa";

function sumIn(txs: Transaction[], from: Date, to: Date, pred: (t: Transaction) => boolean) {
  let s = 0;
  for (const t of txs) {
    const d = parseISO(t.data);
    if (d >= from && d <= to && pred(t)) s += t.valor;
  }
  return s;
}

export interface HealthScore {
  score: number; // 0-100
  label: string;
  tone: "success" | "warning" | "destructive";
  breakdown: { label: string; value: number; max: number }[];
}

export function computeHealthScore(filtered: Transaction[], all: Transaction[]): HealthScore {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const prevStart = startOfMonth(subMonths(today, 1));
  const prevEnd = endOfMonth(subMonths(today, 1));

  const recMes = sumIn(all, monthStart, monthEnd, isInflow);
  const desMes = sumIn(all, monthStart, monthEnd, isOutflow);
  const recPrev = sumIn(all, prevStart, prevEnd, isInflow);
  const desPrev = sumIn(all, prevStart, prevEnd, isOutflow);

  // 1. Taxa de economia (0-40): (rec-des)/rec do mês. >=30% ganha máximo.
  const savingsRate = recMes > 0 ? (recMes - desMes) / recMes : 0;
  const savingsPts = Math.max(0, Math.min(40, (savingsRate / 0.3) * 40));

  // 2. Reserva (0-30): saldo acumulado do período filtrado vs despesa mensal (meses de reserva).
  const recFilt = filtered.filter(isInflow).reduce((s, t) => s + t.valor, 0);
  const desFilt = filtered.filter(isOutflow).reduce((s, t) => s + t.valor, 0);
  const reserva = recFilt - desFilt;
  const mesesReserva = desMes > 0 ? reserva / desMes : reserva > 0 ? 6 : 0;
  const reservaPts = Math.max(0, Math.min(30, (mesesReserva / 6) * 30));

  // 3. Controle de gastos (0-30): gasto vs mês anterior. Igual/menor = 30, +50% ou mais = 0.
  const varDes = desPrev > 0 ? (desMes - desPrev) / desPrev : 0;
  const gastoPts = Math.max(0, Math.min(30, 30 - (varDes / 0.5) * 30));

  const score = Math.round(savingsPts + reservaPts + gastoPts);
  const tone: HealthScore["tone"] = score >= 70 ? "success" : score >= 40 ? "warning" : "destructive";
  const label = score >= 70 ? "Saudável" : score >= 40 ? "Atenção" : "Crítico";
  return {
    score,
    label,
    tone,
    breakdown: [
      { label: "Taxa de economia", value: Math.round(savingsPts), max: 40 },
      { label: "Reserva acumulada", value: Math.round(reservaPts), max: 30 },
      { label: "Controle de gastos", value: Math.round(gastoPts), max: 30 },
    ],
  };
}

export interface BehaviorMetrics {
  mediaDia: number;
  mediaSemana: number;
  mediaCompra: number;
  ticketMedio: number;
  numTransacoes: number;
  diasCobertos: number;
}

export function computeBehavior(filtered: Transaction[]): BehaviorMetrics {
  const desp = filtered.filter(isOutflow);
  const total = desp.reduce((s, t) => s + t.valor, 0);
  const num = desp.length;
  const dates = filtered.map((t) => parseISO(t.data)).sort((a, b) => a.getTime() - b.getTime());
  const dias = dates.length > 0 ? Math.max(1, differenceInCalendarDays(dates[dates.length - 1], dates[0]) + 1) : 1;
  return {
    mediaDia: total / dias,
    mediaSemana: (total / dias) * 7,
    mediaCompra: num > 0 ? total / num : 0,
    ticketMedio: filtered.length > 0 ? filtered.reduce((s, t) => s + t.valor, 0) / filtered.length : 0,
    numTransacoes: filtered.length,
    diasCobertos: dias,
  };
}

export interface SmartAlert {
  kind: "warn" | "good";
  text: string;
}

export function computeAlerts(all: Transaction[]): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Categoria acima da média histórica (últimos 6 meses excluindo o atual)
  const catAtual = new Map<string, number>();
  for (const t of all) {
    if (!isOutflow(t)) continue;
    const d = parseISO(t.data);
    if (d < monthStart || d > monthEnd) continue;
    const k = t.categoria ?? "—";
    catAtual.set(k, (catAtual.get(k) ?? 0) + t.valor);
  }
  const histInicio = startOfMonth(subMonths(today, 6));
  const histFim = endOfMonth(subMonths(today, 1));
  const catHist = new Map<string, { total: number; meses: Set<string> }>();
  for (const t of all) {
    if (!isOutflow(t)) continue;
    const d = parseISO(t.data);
    if (d < histInicio || d > histFim) continue;
    const k = t.categoria ?? "—";
    const cur = catHist.get(k) ?? { total: 0, meses: new Set<string>() };
    cur.total += t.valor;
    cur.meses.add(t.data.slice(0, 7));
    catHist.set(k, cur);
  }
  for (const [cat, val] of catAtual) {
    const h = catHist.get(cat);
    if (!h || h.meses.size === 0) continue;
    const media = h.total / h.meses.size;
    if (media < 50) continue;
    const diff = (val - media) / media;
    if (diff >= 0.2) {
      alerts.push({ kind: "warn", text: `${cat} está ${Math.round(diff * 100)}% acima da média mensal.` });
    } else if (diff <= -0.2 && val > 0) {
      alerts.push({ kind: "good", text: `${cat} está ${Math.round(-diff * 100)}% abaixo da média mensal.` });
    }
  }

  // Descrição destacada — top descrição do mês (ex: delivery)
  const descMap = new Map<string, number>();
  for (const t of all) {
    if (!isOutflow(t)) continue;
    const d = parseISO(t.data);
    if (d < monthStart || d > monthEnd) continue;
    const k = (t.descricao ?? "").trim().toLowerCase();
    if (!k) continue;
    descMap.set(k, (descMap.get(k) ?? 0) + t.valor);
  }
  const topDesc = Array.from(descMap.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topDesc && topDesc[1] >= 200) {
    alerts.push({ kind: "warn", text: `Você gastou ${brl(topDesc[1])} em "${topDesc[0]}" neste mês.` });
  }

  // Comparativo economia vs mês anterior
  const prevStart = startOfMonth(subMonths(today, 1));
  const prevEnd = endOfMonth(subMonths(today, 1));
  const ecoMes = sumIn(all, monthStart, monthEnd, isInflow) - sumIn(all, monthStart, monthEnd, isOutflow);
  const ecoPrev = sumIn(all, prevStart, prevEnd, isInflow) - sumIn(all, prevStart, prevEnd, isOutflow);
  if (ecoMes > ecoPrev && ecoPrev >= 0 && ecoMes > 0) {
    alerts.push({ kind: "good", text: `Você economizou mais do que no mês passado (+${brl(ecoMes - ecoPrev)}).` });
  } else if (ecoMes < ecoPrev - 100) {
    alerts.push({ kind: "warn", text: `Sua economia caiu ${brl(ecoPrev - ecoMes)} vs mês anterior.` });
  }

  // Categoria com menor gasto histórico no mês atual
  for (const [cat, h] of catHist) {
    if (h.meses.size < 3) continue;
    const media = h.total / h.meses.size;
    const val = catAtual.get(cat) ?? 0;
    if (val > 0 && val < media * 0.6 && media > 100) {
      alerts.push({ kind: "good", text: `Este foi um dos meses com menor gasto em ${cat}.` });
      break;
    }
  }

  return alerts.slice(0, 6);
}

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

// Variação percentual filtrada vs período anterior de mesma duração
export interface PeriodDelta {
  receitas: number;
  despesas: number;
  saldo: number;
}
export function computePeriodDeltas(filtered: Transaction[], all: Transaction[]): PeriodDelta | null {
  if (filtered.length === 0) return null;
  const dates = filtered.map((t) => parseISO(t.data)).sort((a, b) => a.getTime() - b.getTime());
  const from = dates[0];
  const to = dates[dates.length - 1];
  const dias = Math.max(1, differenceInCalendarDays(to, from) + 1);
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (dias - 1));
  const rec = filtered.filter(isInflow).reduce((s, t) => s + t.valor, 0);
  const des = filtered.filter(isOutflow).reduce((s, t) => s + t.valor, 0);
  const recP = sumIn(all, prevFrom, prevTo, isInflow);
  const desP = sumIn(all, prevFrom, prevTo, isOutflow);
  const pct = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / b) * 100);
  return { receitas: pct(rec, recP), despesas: pct(des, desP), saldo: pct(rec - des, recP - desP) };
}
