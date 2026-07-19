import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useState } from "react";
import type { Transaction } from "@/lib/types";
import { despesasPorCategoria, despesasPorForma, evolucaoDiaria, fluxoMensal, fmtBRL, fmtBRLShort, saldoPorConta, topN, historicalCategoryAvg } from "@/lib/finance";
import { CATEGORY_PALETTE } from "@/components/finance/AdvancedCharts";
import { AlertTriangle } from "lucide-react";

const C1 = "oklch(0.85 0.25 155)"; // success/verde
const C2 = "oklch(0.65 0.21 260)"; // primary/azul
const C3 = "oklch(0.62 0.25 305)"; // roxo
const C4 = "oklch(0.74 0.18 50)"; // laranja
const C5 = "oklch(0.75 0.13 200)"; // ciano
const PALETTE = [C1, C2, C3, C4, C5];

const tooltipStyle = {
  backgroundColor: "oklch(0.18 0.025 270)",
  border: "1px solid oklch(1 0 0 / 0.1)",
  borderRadius: 12,
  fontSize: 12,
  color: "#ffffff",
};
const tooltipItemStyle = { color: "#ffffff" } as const;
const tooltipLabelStyle = { color: "#ffffff", fontWeight: 600 } as const;
const tooltipCursor = { fill: "oklch(1 0 0 / 0.06)" } as const;

export function ChartCard({ title, sub, children, className, height = 260 }: { title: string; sub?: string; children: React.ReactNode; className?: string; height?: number | "auto" }) {
  const style = height === "auto" ? undefined : { height };
  return (
    <div className={`glass rounded-2xl p-4 flex flex-col ${className ?? ""}`}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <div style={style} className={height === "auto" ? "flex-1 min-h-0" : ""}>{children}</div>
    </div>
  );
}

export function EvolucaoChart({ txs }: { txs: Transaction[] }) {
  const data = evolucaoDiaria(txs);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C1} stopOpacity={0.5} />
            <stop offset="100%" stopColor={C1} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gDes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C4} stopOpacity={0.5} />
            <stop offset="100%" stopColor={C4} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gSal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C2} stopOpacity={0.5} />
            <stop offset="100%" stopColor={C2} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <YAxis tickFormatter={fmtBRLShort} tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <Tooltip
          cursor={tooltipCursor}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div style={{ ...tooltipStyle, padding: "8px 10px" }}>
                <div style={{ ...tooltipLabelStyle, marginBottom: 4 }}>{label}</div>
                {payload.map((p) => (
                  <div key={p.dataKey as string} style={{ display: "flex", alignItems: "center", gap: 6, ...tooltipItemStyle }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: "inline-block" }} />
                    <span>{p.name}:</span>
                    <strong>{fmtBRL(p.value as number)}</strong>
                  </div>
                ))}
              </div>
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        <Area type="monotone" dataKey="receitas" name="Receitas" stroke={C1} fill="url(#gRec)" strokeWidth={2} />
        <Area type="monotone" dataKey="despesas" name="Despesas" stroke={C4} fill="url(#gDes)" strokeWidth={2} />
        <Area type="monotone" dataKey="saldo" name="Saldo acumulado" stroke={C2} fill="url(#gSal)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FluxoMensalChart({ txs }: { txs: Transaction[] }) {
  const data = fluxoMensal(txs);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <YAxis tickFormatter={fmtBRLShort} tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={tooltipCursor} formatter={(v: number) => fmtBRL(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="receitas" name="Receitas" fill={C1} radius={[6, 6, 0, 0]} />
        <Bar dataKey="despesas" name="Despesas" fill={C4} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoriasChart({ txs }: { txs: Transaction[] }) {
  const data = despesasPorCategoria(txs);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
        <XAxis type="number" tickFormatter={fmtBRLShort} tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} width={100} />
        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={tooltipCursor} formatter={(v: number) => fmtBRL(v)} />
        <Bar dataKey="valor" radius={[0, 8, 8, 0]}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ParticipacaoChart({
  txs,
  allTxs,
  onCategoryClick,
}: {
  txs: Transaction[];
  allTxs?: Transaction[];
  onCategoryClick?: (categoria: string) => void;
}) {
  const raw = despesasPorCategoria(txs);
  const total = raw.reduce((s, d) => s + d.valor, 0);
  const top = raw.slice(0, 9);
  const restoVal = raw.slice(9).reduce((s, d) => s + d.valor, 0);
  const data = restoVal > 0 ? [...top, { categoria: "Outras", valor: restoVal }] : top;
  const avgMap = allTxs ? historicalCategoryAvg(allTxs) : new Map<string, number>();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visible = data.filter((d) => !hidden.has(d.categoria));

  if (!data.length) {
    return <p className="text-xs text-muted-foreground p-4">Sem despesas no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 4, right: 4, bottom: 56, left: 4 }}>
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(v: number, n) => {
            const avg = avgMap.get(String(n));
            const pct = total ? ((v / total) * 100).toFixed(1) : "0";
            const delta = avg && avg > 0 ? ` · ${v > avg ? "+" : ""}${(((v - avg) / avg) * 100).toFixed(0)}% vs média` : "";
            return [`${fmtBRL(v)} · ${pct}%${delta}`, n];
          }}
        />
        <Pie
          data={visible}
          dataKey="valor"
          nameKey="categoria"
          cx="50%"
          cy="42%"
          innerRadius="32%"
          outerRadius="56%"
          paddingAngle={2}
          labelLine={false}
          onClick={(p: { categoria?: string }) => {
            if (p?.categoria && p.categoria !== "Outras") onCategoryClick?.(p.categoria);
          }}
          label={(p: { percent?: number }) =>
            p.percent && p.percent >= 0.08 ? `${(p.percent * 100).toFixed(0)}%` : ""
          }
          style={{ cursor: onCategoryClick ? "pointer" : "default" }}
        >
          {visible.map((d, i) => {
            const origIdx = data.findIndex((x) => x.categoria === d.categoria);
            const avg = avgMap.get(d.categoria);
            const above = avg && avg > 0 && d.valor > avg * 1.2;
            return (
              <Cell
                key={i}
                fill={CATEGORY_PALETTE[origIdx % CATEGORY_PALETTE.length]}
                stroke={above ? "oklch(0.75 0.18 30)" : "oklch(0.13 0.02 270)"}
                strokeWidth={above ? 3 : 2}
              />
            );
          })}
        </Pie>
        <Legend
          layout="horizontal"
          align="center"
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 10, lineHeight: "14px", paddingTop: 10, bottom: 0 }}
          payload={data.map((item, idx) => ({
            id: item.categoria,
            value: item.categoria,
            type: "circle" as const,
            color: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
            inactive: hidden.has(item.categoria),
          }))}
          onClick={(e: { value?: string }) => {
            const cat = e?.value;
            if (!cat) return;
            setHidden((prev) => {
              const next = new Set(prev);
              if (next.has(cat)) next.delete(cat);
              else next.add(cat);
              return next;
            });
          }}
          formatter={(value: string) => {
            const item = data.find((d) => d.categoria === value);
            const pct = total && item ? ((item.valor / total) * 100).toFixed(1) : "0";
            const avg = item ? avgMap.get(item.categoria) : undefined;
            const above = item && avg && avg > 0 && item.valor > avg * 1.2;
            const inactive = hidden.has(value);
            return (
              <span style={{ color: inactive ? "oklch(0.5 0.02 270)" : "oklch(0.85 0.02 270)", textDecoration: inactive ? "line-through" : "none", cursor: "pointer" }}>
                {above && <AlertTriangle className="inline size-3 mr-0.5 text-[color:var(--warning)]" />}
                {value} <span style={{ opacity: 0.6 }}>· {pct}%</span>
              </span>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FormaPagtoChart({ txs }: { txs: Transaction[] }) {
  const data = despesasPorForma(txs);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
        <XAxis dataKey="forma" tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <YAxis tickFormatter={fmtBRLShort} tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={tooltipCursor} formatter={(v: number) => fmtBRL(v)} />
        <Bar dataKey="valor" fill={C3} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SaldoContaChart({ txs }: { txs: Transaction[] }) {
  const data = saldoPorConta(txs);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
        <XAxis dataKey="conta" tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <YAxis tickFormatter={fmtBRLShort} tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={tooltipCursor} formatter={(v: number) => fmtBRL(v)} />
        <Bar dataKey="saldo" radius={[8, 8, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.saldo >= 0 ? C1 : C4} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopList({ txs, type }: { txs: Transaction[]; type: "Receita" | "Despesa" }) {
  const items = topN(txs, type, 10);
  return (
    <div className="space-y-1.5">
      {items.length === 0 && <p className="text-xs text-muted-foreground">Nenhum lançamento.</p>}
      {items.map((t) => (
        <div key={t.id} className="flex items-center justify-between text-xs gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{t.descricao || t.categoria || "—"}</div>
            <div className="text-[10px] text-muted-foreground truncate">{t.categoria} · {t.conta}</div>
          </div>
          <div className={`font-semibold whitespace-nowrap ${type === "Receita" ? "text-[color:var(--success)]" : "text-[color:var(--warning)]"}`}>
            {fmtBRL(t.valor)}
          </div>
        </div>
      ))}
    </div>
  );
}
