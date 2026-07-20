import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { fmtBRL } from "@/lib/finance";
import type { Account } from "@/lib/projection";
import type { Transaction } from "@/lib/types";

// Saldo = soma(Receita) - soma(Despesa) baseado APENAS nos lançamentos filtrados.
function saldoFromTxs(txs: Transaction[]) {
  let s = 0;
  for (const t of txs) {
    if (t.tipo === "Receita") s += t.valor;
    else if (t.tipo === "Despesa") s -= t.valor;
  }
  return s;
}

export function SaldoConsolidadoHero({
  accounts,
  txs,
}: {
  accounts: Account[];
  txs: Transaction[];
}) {
  const ativas = accounts.filter((a) => a.status === "ativa");
  const geral = saldoFromTxs(txs);

  return (
    <div className="grid grid-cols-1 gap-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 lg:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, oklch(0.18 0.04 260), oklch(0.16 0.05 305))" }}
      >
        <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground mb-2">
          <Wallet className="size-4" /> Saldo Consolidado
        </div>
        <div className={`text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mt-2 ${geral >= 0 ? "text-[color:var(--success)]" : "text-[color:var(--destructive)]"}`}>
          {fmtBRL(geral)}
        </div>
        <div className="text-sm text-muted-foreground mt-4 opacity-80 font-medium">
          Receitas − Despesas · Baseado nos filtros aplicados ({txs.length} lançamentos)
        </div>
      </motion.div>
    </div>
  );
}
