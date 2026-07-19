import {
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  LabelList,
} from "recharts";
import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import { fmtBRL, fmtBRLShort, historicalCategoryAvg } from "@/lib/finance";
import { AlertTriangle } from "lucide-react";

import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Paleta categórica ampla e distinta (matiz bem espaçada)
export const CATEGORY_PALETTE = [
  "oklch(0.72 0.20 25)",
  "oklch(0.74 0.18 60)",
  "oklch(0.82 0.17 95)",
  "oklch(0.78 0.20 140)",
  "oklch(0.70 0.18 175)",
  "oklch(0.72 0.15 215)",
  "oklch(0.62 0.21 260)",
  "oklch(0.60 0.24 295)",
  "oklch(0.68 0.24 330)",
  "oklch(0.70 0.20 10)",
  "oklch(0.68 0.14 75)",
  "oklch(0.74 0.14 160)",
  "oklch(0.66 0.18 240)",
  "oklch(0.78 0.12 310)",
  "oklch(0.62 0.16 45)",
  "oklch(0.70 0.15 190)",
];

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

// === Distribuição por categoria — CONTAGEM de lançamentos por categoria (Top 10) ===
export function CategoriaTreemap({
  txs,
  allTxs,
  onCategoryClick,
}: {
  txs: Transaction[];
  allTxs?: Transaction[];
  onCategoryClick?: (categoria: string) => void;
}) {
  const { data, total, avgMap } = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      const k = t.categoria?.trim() || "—";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    const arr = Array.from(map.entries())
      .map(([categoria, count]) => ({ categoria, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const total = arr.reduce((s, x) => s + x.count, 0);
    // valor gasto por categoria no período filtrado (para comparar com média histórica)
    const valMap = new Map<string, number>();
    for (const t of txs) {
      if (t.tipo !== "Despesa") continue;
      const k = t.categoria?.trim() || "—";
      valMap.set(k, (valMap.get(k) ?? 0) + t.valor);
    }
    const avgMap = allTxs ? historicalCategoryAvg(allTxs) : new Map<string, number>();
    return {
      total,
      avgMap,
      data: arr.map((x) => {
        const avg = avgMap.get(x.categoria);
        const val = valMap.get(x.categoria) ?? 0;
        const above = avg && avg > 0 && val > avg * 1.2;
        return { ...x, pct: total ? (x.count / total) * 100 : 0, above: !!above };
      }),
    };
  }, [txs, allTxs]);

  if (!data.length) {
    return <p className="text-xs text-muted-foreground p-4">Sem lançamentos no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 72, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <YAxis
          type="category"
          dataKey="categoria"
          width={130}
          tick={(props: { x?: number; y?: number; payload?: { value?: string } }) => {
            const { x = 0, y = 0, payload } = props;
            const cat = payload?.value ?? "";
            const item = data.find((d) => d.categoria === cat);
            return (
              <g transform={`translate(${x},${y})`}>
                {item?.above && (
                  <AlertTriangle x={-125} y={-6} width={11} height={11} className="text-[color:var(--warning)]" />
                )}
                <text x={-110} y={0} dy={4} textAnchor="start" fill="oklch(0.85 0.02 270)" fontSize={11}>
                  {cat}
                </text>
              </g>
            );
          }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          cursor={tooltipCursor}
          formatter={(v: number, _n, p) => {
            const cat = p?.payload?.categoria;
            const avg = cat ? avgMap.get(cat) : undefined;
            const extra = avg ? ` · média histórica ${fmtBRL(avg)}` : "";
            return [`${v} lançamento(s) · ${(p?.payload?.pct ?? 0).toFixed(1)}% de ${total}${extra}`, "Categoria"];
          }}
        />
        <Bar
          dataKey="count"
          radius={[0, 8, 8, 0]}
          onClick={(p: { categoria?: string }) => {
            if (p?.categoria) onCategoryClick?.(p.categoria);
          }}
          style={{ cursor: onCategoryClick ? "pointer" : "default" }}
        >
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
              stroke={d.above ? "oklch(0.75 0.18 30)" : "transparent"}
              strokeWidth={d.above ? 2 : 0}
            />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            formatter={(v: number) => `${v}`}
            style={{ fill: "oklch(0.85 0.02 270)", fontSize: 11, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// === Evolução por categoria — barras VERTICAIS empilhadas por dia ===
export function EvolucaoCategoriasChart({
  txs,
  onCategoryClick,
}: {
  txs: Transaction[];
  onCategoryClick?: (categoria: string) => void;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const { data, categorias } = useMemo(() => {
    const despesas = txs.filter(
      (x) => x.tipo === "Despesa" && !!x.categoria && x.categoria.trim() !== "",
    );

    const totalByCat = new Map<string, number>();
    for (const t of despesas) {
      const k = (t.categoria as string).trim();
      totalByCat.set(k, (totalByCat.get(k) ?? 0) + t.valor);
    }
    const catsWithMovement = Array.from(totalByCat.entries()).filter(([, v]) => v > 0);
    const topCats = catsWithMovement
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([n]) => n);
    const topSet = new Set(topCats);
    const hasOutras = catsWithMovement.length > topCats.length;
    const allCatsCandidates = hasOutras ? [...topCats, "Outras"] : topCats;

    const diasSet = new Set(despesas.map((t) => t.data.slice(0, 10)));
    const byMonth = diasSet.size > 90;

    const bucket = new Map<string, Map<string, number>>();
    for (const t of despesas) {
      const key = byMonth ? t.data.slice(0, 7) : t.data.slice(0, 10);
      const cat = (t.categoria as string).trim();
      const series = topSet.has(cat) ? cat : "Outras";
      if (!bucket.has(key)) bucket.set(key, new Map());
      const m = bucket.get(key)!;
      m.set(series, (m.get(series) ?? 0) + t.valor);
    }

    const seriesTotal = new Map<string, number>();
    for (const m of bucket.values()) {
      for (const [c, v] of m) seriesTotal.set(c, (seriesTotal.get(c) ?? 0) + v);
    }
    const allCats = allCatsCandidates.filter((c) => (seriesTotal.get(c) ?? 0) > 0);

    const data = Array.from(bucket.keys())
      .sort()
      .map((k) => {
        const row: Record<string, number | string> = {
          key: k,
          label: byMonth
            ? format(parseISO(k + "-01"), "MMM/yy", { locale: ptBR })
            : format(parseISO(k), "dd/MM", { locale: ptBR }),
        };
        for (const c of allCats) row[c] = bucket.get(k)?.get(c) ?? 0;
        return row;
      });

    return { data, categorias: allCats };
  }, [txs]);

  if (!data.length || !categorias.length) {
    return <p className="text-xs text-muted-foreground p-4">Sem dados no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} interval="preserveStartEnd" />
        <YAxis tickFormatter={fmtBRLShort} tick={{ fontSize: 11, fill: "oklch(0.7 0.02 270)" }} />
        <Tooltip
          cursor={tooltipCursor}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const items = payload
              .filter((p) => typeof p.value === "number" && (p.value as number) > 0)
              .sort((a, b) => (b.value as number) - (a.value as number));
            if (!items.length) return null;
            return (
              <div style={{ ...tooltipStyle, padding: "8px 10px" }}>
                <div style={tooltipLabelStyle}>{label}</div>
                {items.map((it) => (
                  <div key={String(it.dataKey)} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color as string, display: "inline-block" }} />
                    <span style={tooltipItemStyle}>{it.name}: {fmtBRL(it.value as number)}</span>
                  </div>
                ))}
              </div>
            );
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
          onClick={(e) => {
            const cat = (e?.value ?? (typeof e?.dataKey === "string" ? e.dataKey : undefined)) as string | undefined;
            if (!cat) return;
            setHidden((prev) => {
              const next = new Set(prev);
              if (next.has(cat)) next.delete(cat);
              else next.add(cat);
              return next;
            });
          }}
          formatter={(value: string) => (
            <span
              style={{
                color: hidden.has(value) ? "oklch(0.5 0.02 270)" : "oklch(0.85 0.02 270)",
                textDecoration: hidden.has(value) ? "line-through" : "none",
              }}
              onDoubleClick={(ev) => {
                ev.stopPropagation();
                if (value !== "Outras") onCategoryClick?.(value);
              }}
              title={value !== "Outras" ? "Duplo-clique para ver transações" : undefined}
            >
              {value}
            </span>
          )}
        />
        {categorias.map((c, i) => {
          const color = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
          const isLast = i === categorias.length - 1;
          if (hidden.has(c)) return null;
          return (
            <Bar
              key={c}
              dataKey={c}
              name={c}
              stackId="cat"
              fill={color}
              radius={isLast ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              onClick={() => {
                if (c !== "Outras") onCategoryClick?.(c);
              }}
              style={{ cursor: onCategoryClick && c !== "Outras" ? "pointer" : "default" }}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
