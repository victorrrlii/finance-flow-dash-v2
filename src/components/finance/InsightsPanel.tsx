import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Calendar, ShoppingBag, Receipt, Hash } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { computeHealthScore, computeBehavior, computeAlerts, computePeriodDeltas } from "@/lib/insights";
import { fmtBRL } from "@/lib/finance";

export function InsightsPanel({ filtered, all }: { filtered: Transaction[]; all: Transaction[] }) {
  const health = computeHealthScore(filtered, all);
  const behavior = computeBehavior(filtered);
  const alerts = computeAlerts(all);
  const deltas = computePeriodDeltas(filtered, all);

  const toneColor =
    health.tone === "success" ? "var(--success)" : health.tone === "warning" ? "var(--warning)" : "var(--destructive)";
  const circ = 2 * Math.PI * 42;
  const dash = (health.score / 100) * circ;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Score de saúde financeira */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 lg:col-span-1"
      >
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Activity className="size-4" /> Saúde financeira</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full`} style={{ background: `color-mix(in oklab, ${toneColor} 20%, transparent)`, color: toneColor }}>{health.label}</span>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="color-mix(in oklab, currentColor 15%, transparent)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={toneColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                style={{ transition: "stroke-dasharray .6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-semibold" style={{ color: toneColor }}>{health.score}</span>
              <span className="text-[9px] text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            {health.breakdown.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{b.label}</span><span>{b.value}/{b.max}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(b.value / b.max) * 100}%`, background: toneColor }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Indicadores comportamentais */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-4 lg:col-span-1"
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="size-4" /> Comportamento
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniStat icon={<Calendar className="size-3.5" />} label="Média/dia" value={fmtBRL(behavior.mediaDia)} delta={deltas?.despesas} inverse />
          <MiniStat icon={<Calendar className="size-3.5" />} label="Média/semana" value={fmtBRL(behavior.mediaSemana)} />
          <MiniStat icon={<ShoppingBag className="size-3.5" />} label="Média/compra" value={fmtBRL(behavior.mediaCompra)} />
          <MiniStat icon={<Receipt className="size-3.5" />} label="Ticket médio" value={fmtBRL(behavior.ticketMedio)} />
          <MiniStat icon={<Hash className="size-3.5" />} label="Transações" value={String(behavior.numTransacoes)} />
          <MiniStat icon={<Calendar className="size-3.5" />} label="Dias no período" value={String(behavior.diasCobertos)} />
        </div>
      </motion.div>

      {/* Alertas inteligentes */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4 lg:col-span-1"
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="size-4" /> Alertas inteligentes
        </div>
        <div className="mt-3 space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
          {alerts.length === 0 && (
            <div className="text-xs text-muted-foreground py-4 text-center">Nenhum alerta relevante no momento.</div>
          )}
          {alerts.map((a, i) => {
            const color = a.kind === "warn" ? "var(--warning)" : "var(--success)";
            const Icon = a.kind === "warn" ? AlertTriangle : CheckCircle2;
            return (
              <div key={i} className="flex items-start gap-2 text-xs rounded-lg px-2 py-1.5" style={{ background: `color-mix(in oklab, ${color} 10%, transparent)` }}>
                <Icon className="size-3.5 shrink-0 mt-0.5" style={{ color }} />
                <span className="leading-snug">{a.text}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function MiniStat({ icon, label, value, delta, inverse }: { icon: React.ReactNode; label: string; value: string; delta?: number; inverse?: boolean }) {
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const good = showDelta ? (inverse ? delta! <= 0 : delta! >= 0) : true;
  const Arrow = showDelta ? (delta! >= 0 ? TrendingUp : TrendingDown) : null;
  const color = good ? "var(--success)" : "var(--destructive)";
  return (
    <div className="rounded-lg bg-muted/20 px-2.5 py-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">{icon} {label}</span>
        {showDelta && Arrow && (
          <span className="flex items-center gap-0.5" style={{ color }}>
            <Arrow className="size-3" />{Math.abs(delta!).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="text-sm font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}
