import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, TrendingUp, Wallet, Target, CalendarDays } from "lucide-react";
import type { KPIs, SaldoVADiario } from "@/lib/finance";
import { fmtBRL } from "@/lib/finance";

export function KPICards({ k, saldoVA }: { k: KPIs; saldoVA?: SaldoVADiario | null }) {
  const items: Array<{
    icon: React.ReactNode;
    label: string;
    value: string;
    tone: string;
    sub: string;
  }> = [
    { icon: <Wallet className="size-4" />, label: "Saldo (período)", value: fmtBRL(k.saldo), tone: k.saldo >= 0 ? "success" : "destructive", sub: `${k.countReceitas} entradas / ${k.countDespesas} saídas` },
    { icon: <ArrowUp className="size-4" />, label: "Receitas", value: fmtBRL(k.receitas), tone: "success", sub: variation(k.varReceitas, "vs mês anterior") },
    { icon: <ArrowDown className="size-4" />, label: "Despesas", value: fmtBRL(k.despesas), tone: "warning", sub: variation(k.varDespesas, "vs mês anterior", true) },
    { icon: <TrendingUp className="size-4" />, label: "Resultado do mês", value: fmtBRL(k.resultadoMes), tone: k.resultadoMes >= 0 ? "success" : "destructive", sub: variation(k.varSaldo, "vs mês anterior") },
    { icon: <Target className="size-4" />, label: "Maior categoria", value: k.maiorCategoriaGasto?.nome ?? "—", tone: "accent", sub: k.maiorCategoriaGasto ? fmtBRL(k.maiorCategoriaGasto.valor) : "—" },
  ];

  if (saldoVA) {
    items.push({
      icon: <CalendarDays className="size-4" />,
      label: "VA diário disponível",
      value: fmtBRL(saldoVA.diario),
      tone: saldoVA.diario >= 0 ? "accent" : "destructive",
      sub: `${fmtBRL(saldoVA.saldo)} ÷ ${saldoVA.diasRestantes} dia(s) restantes`,
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="glass rounded-2xl p-4 hover:shadow-[var(--shadow-glow)] transition"
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="flex items-center gap-1.5">{it.icon} {it.label}</span>
          </div>
          <div className={`mt-2 text-xl font-semibold tracking-tight ${toneClass(it.tone)}`}>{it.value}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">{it.sub}</div>
        </motion.div>
      ))}
    </div>
  );
}

function toneClass(tone: string) {
  switch (tone) {
    case "success": return "text-[color:var(--success)]";
    case "warning": return "text-[color:var(--warning)]";
    case "destructive": return "text-[color:var(--destructive)]";
    case "accent": return "text-[color:var(--accent)]";
    default: return "";
  }
}

function variation(pct: number, label: string, inverse = false) {
  if (!Number.isFinite(pct)) return label;
  const arrow = pct >= 0 ? "▲" : "▼";
  const good = inverse ? pct <= 0 : pct >= 0;
  return `${arrow} ${pct.toFixed(1)}% ${label} ${good ? "" : ""}`.trim();
}
