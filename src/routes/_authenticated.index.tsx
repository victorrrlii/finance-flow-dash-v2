import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTransactions } from "@/lib/transactions.functions";
import { listAccounts } from "@/lib/manage.functions";
import { applyFilters, computeKPIs, computeSaldoVADiario, initialFilters, type FilterState } from "@/lib/finance";
import type { Account } from "@/lib/projection";
import { FilterBar } from "@/components/finance/FilterBar";
import { KPICards } from "@/components/finance/KPICards";
import { ChartCard, EvolucaoChart, FormaPagtoChart, ParticipacaoChart, SaldoContaChart, TopList } from "@/components/finance/Charts";
import { CategoriaTreemap, EvolucaoCategoriasChart } from "@/components/finance/AdvancedCharts";
import { SaldoConsolidadoHero } from "@/components/finance/SaldoConsolidadoHero";
import { ReceitaDespesaMensalChart } from "@/components/finance/MonthlyBarChart";
import { FinancialCalendar } from "@/components/finance/FinancialCalendar";
import { AssinaturasCard } from "@/components/finance/AssinaturasCard";
import { InsightsPanel } from "@/components/finance/InsightsPanel";
import { CategoryDrilldownDialog } from "@/components/finance/CategoryDrilldownDialog";
import { historicalCategoryAvg } from "@/lib/finance";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Upload, FileDown } from "lucide-react";
import { exportElementToPDF } from "@/lib/pdf-export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard — Central Financeira" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const fetchFn = useServerFn(listTransactions);
  const accFn = useServerFn(listAccounts);
  const { data, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchFn(),
  });
  const accs = useQuery({ queryKey: ["accounts"], queryFn: () => accFn() });
  const txs = data?.items ?? [];
  const accounts = (accs.data?.items ?? []) as unknown as Account[];
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [drilldownCat, setDrilldownCat] = useState<string | null>(null);
  const filtered = useMemo(() => applyFilters(txs, filters), [txs, filters]);
  const kpis = useMemo(() => computeKPIs(filtered, txs), [filtered, txs]);
  const catAvgMap = useMemo(() => historicalCategoryAvg(txs), [txs]);
  const isCurrentMonth = filters.period === "mtd";
  const saldoVA = useMemo(
    () => (isCurrentMonth ? computeSaldoVADiario(accounts as unknown as { id: string; nome: string; saldo_inicial: number; status: string }[], txs) : null),
    [accounts, txs, isCurrentMonth],
  );
  const updatedAt = txs[0]?.imported_at ? new Date(txs[0].imported_at).toLocaleString("pt-BR") : "—";
  const dashRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const handleExportPDF = async () => {
    if (!dashRef.current) return;
    setExporting(true);
    try {
      await exportElementToPDF(dashRef.current, `dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF gerado!");
    } catch (e) {
      toast.error("Falha ao gerar PDF: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (txs.length === 0) {
    return (
      <div className="p-10 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-semibold text-gradient-primary">Bem-vindo!</h1>
        <p className="text-sm text-muted-foreground mt-2">Importe sua primeira planilha para começar.</p>
        <Link to="/import"><Button className="mt-5 gap-2"><Upload className="size-4" /> Importar planilha</Button></Link>
      </div>
    );
  }

  return (
    <div ref={dashRef} className="p-4 md:p-6 space-y-4">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gradient-primary">Central Financeira Inteligente</h1>
          <p className="text-xs text-muted-foreground">Última atualização: {updatedAt}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF} disabled={exporting}>
            <FileDown className="size-4" /> {exporting ? "Gerando..." : "Exportar PDF"}
          </Button>
          <Link to="/import"><Button variant="outline" size="sm" className="gap-2"><Upload className="size-4" /> Nova importação</Button></Link>
        </div>
      </header>

      <FilterBar txs={txs} filters={filters} onChange={setFilters} />
      <SaldoConsolidadoHero accounts={accounts} txs={filtered} />
      <KPICards k={kpis} saldoVA={saldoVA} />
      <InsightsPanel filtered={filtered} all={txs} />


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. Visão temporal geral */}
        <ChartCard title="Evolução financeira" sub="Receitas, despesas e saldo acumulado no período" className="lg:col-span-3">
          <EvolucaoChart txs={filtered} />
        </ChartCard>

        {/* 2. Comparativo mensal receita x despesa */}
        <ChartCard title="Receita vs Despesa por mês" sub="Comparativo mensal agregado" className="lg:col-span-2">
          <ReceitaDespesaMensalChart txs={filtered} />
        </ChartCard>

        {/* 3. Onde o dinheiro vai — participação por categoria */}
        <ChartCard title="Participação das categorias" sub="Clique numa fatia para ver as transações · legenda oculta/mostra" height={260}>
          <ParticipacaoChart txs={filtered} allTxs={txs} onCategoryClick={setDrilldownCat} />
        </ChartCard>

        {/* 4. Mergulho por categoria ao longo do tempo */}
        <ChartCard title="Evolução por categoria" sub="Clique na legenda para ocultar · duplo-clique para drill-down" className="lg:col-span-2">
          <EvolucaoCategoriasChart txs={filtered} onCategoryClick={setDrilldownCat} />
        </ChartCard>

        {/* 5. Distribuição por número de lançamentos */}
        <ChartCard title="Distribuição por categoria" sub="Quantidade de lançamentos · ícone ⚠ = acima da média histórica">
          <CategoriaTreemap txs={filtered} allTxs={txs} onCategoryClick={setDrilldownCat} />
        </ChartCard>

        {/* 6. Recorrentes — assinaturas */}
        <AssinaturasCard txs={filtered} />

        {/* 7. Como foi pago */}
        <ChartCard title="Despesas por forma de pagamento">
          <FormaPagtoChart txs={filtered} />
        </ChartCard>

        {/* 8. Onde ficou o dinheiro */}
        <ChartCard title="Saldo por conta">
          <SaldoContaChart txs={filtered} />
        </ChartCard>

        {/* 9. Rotina diária */}
        <ChartCard title="Calendário financeiro" sub="Lançamentos por dia (clique para detalhes)" className="lg:col-span-3" height="auto">
          <FinancialCalendar txs={filtered} />
        </ChartCard>

        {/* 10. Extremos — maiores lançamentos */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">Top 10 maiores despesas</h3>
          <TopList txs={filtered} type="Despesa" />
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">Top 10 maiores receitas</h3>
          <TopList txs={filtered} type="Receita" />
        </div>
      </div>

      <CategoryDrilldownDialog
        categoria={drilldownCat}
        txs={filtered}
        historicalAvg={drilldownCat ? catAvgMap.get(drilldownCat) : undefined}
        onOpenChange={(o) => !o && setDrilldownCat(null)}
      />
    </div>
  );
}
