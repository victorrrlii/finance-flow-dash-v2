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

  const porConta = ativas
    .map((a) => {
      const nomeLower = (a.nome ?? "").trim().toLowerCase();
      const sub = txs.filter((t) => (t.conta ?? "").trim().toLowerCase() === nomeLower);
      return { conta: a, saldo: saldoFromTxs(sub), count: sub.length };
    })
    .sort((a, b) => b.saldo - a.saldo);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 col-span-2 lg:col-span-2 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, oklch(0.18 0.04 260), oklch(0.16 0.05 305))" }}
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Wallet className="size-3.5" /> Saldo Consolidado (Geral)
        </div>
        <div className={`text-3xl md:text-4xl font-bold mt-2 ${geral >= 0 ? "text-[color:var(--success)]" : "text-[color:var(--destructive)]"}`}>
          {fmtBRL(geral)}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          Receitas − Despesas · {ativas.length} conta(s) · {txs.length} lançamento(s)
        </div>
      </motion.div>

      {porConta.map((p, i) => (
        <motion.div
          key={p.conta.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 + i * 0.03 }}
          className="glass rounded-2xl p-4 hover:shadow-[var(--shadow-glow)] transition"
        >
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: p.conta.cor ?? "#888" }} />
              {p.conta.nome}
            </span>
            <span className="opacity-70">{p.count}</span>
          </div>
          <div className={`mt-2 text-lg font-semibold tracking-tight ${p.saldo >= 0 ? "text-[color:var(--success)]" : "text-[color:var(--destructive)]"}`}>
            {fmtBRL(p.saldo)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Receitas − Despesas</div>
        </motion.div>
      ))}
    </div>
  );
}
