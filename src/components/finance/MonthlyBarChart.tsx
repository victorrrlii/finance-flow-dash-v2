import { useMemo } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { Transaction } from "@/lib/types";
import { fluxoMensal, fmtBRL, fmtBRLShort } from "@/lib/finance";

const tooltipStyle = {
  backgroundColor: "oklch(0.18 0.025 270)",
  border: "1px solid oklch(1 0 0 / 0.1)",
  borderRadius: 12,
  fontSize: 12,
  color: "#ffffff",
};

export function ReceitaDespesaMensalChart({ txs }: { txs: Transaction[] }) {
  const data = useMemo(() => fluxoMensal(txs), [txs]);
  if (!data.length) {
    return <p className="text-xs text-muted-foreground p-4">Sem dados no período.</p>;
  }
  const height = Math.max(220, data.length * 40);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
        <XAxis type="number" tickFormatter={fmtBRLShort} tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <YAxis type="category" dataKey="label" width={70} tick={{ fontSize: 11, fill: "oklch(0.85 0.02 270)" }} />
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={{ color: "#ffffff" }}
          labelStyle={{ color: "#ffffff", fontWeight: 600 }}
          cursor={{ fill: "oklch(1 0 0 / 0.06)" }}
          formatter={(v: number) => fmtBRL(v)}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="receitas" name="Receitas" fill="oklch(0.74 0.18 150)" radius={[0, 6, 6, 0]} />
        <Bar dataKey="despesas" name="Despesas" fill="oklch(0.70 0.20 25)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
