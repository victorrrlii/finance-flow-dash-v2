import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deleteAccount, listAccounts, upsertAccount } from "@/lib/manage.functions";
import { fmtBRL } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "Contas — Central Financeira" }] }),
  component: AccountsPage,
});

const TIPOS = ["Conta Corrente", "Conta Poupança", "Carteira", "Investimento", "Cartão de Crédito", "Outros"];

interface Acc {
  id?: string;
  nome: string;
  tipo: string;
  saldo_inicial: number;
  data_inicial: string;
  cor: string;
  status: "ativa" | "inativa";
}

const empty: Acc = {
  nome: "",
  tipo: "Conta Corrente",
  saldo_inicial: 0,
  data_inicial: new Date().toISOString().slice(0, 10),
  cor: "#3B82F6",
  status: "ativa",
};

function AccountsPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listAccounts);
  const saveFn = useServerFn(upsertAccount);
  const delFn = useServerFn(deleteAccount);

  const { data, isLoading } = useQuery({ queryKey: ["accounts"], queryFn: () => fetchFn() });
  const [editing, setEditing] = useState<Acc | null>(null);

  const save = useMutation({
    mutationFn: (v: Acc) => saveFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Conta salva.");
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Conta removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gradient-primary">Contas</h1>
          <p className="text-xs text-muted-foreground">Cadastre cada conta com saldo inicial — usados para o Saldo Consolidado.</p>
        </div>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(empty)} className="gap-1"><Plus className="size-4" /> Nova conta</Button>
          </DialogTrigger>
          {editing && (
            <DialogContent>
              <DialogHeader><DialogTitle>{editing.id ? "Editar conta" : "Nova conta"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome"><Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></Field>
                <Field label="Tipo">
                  <Select value={editing.tipo} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Saldo inicial">
                  <Input type="number" step="0.01" value={editing.saldo_inicial}
                    onChange={(e) => setEditing({ ...editing, saldo_inicial: Number(e.target.value) })} />
                </Field>
                <Field label="Data inicial">
                  <Input type="date" value={editing.data_inicial}
                    onChange={(e) => setEditing({ ...editing, data_inicial: e.target.value })} />
                </Field>
                <Field label="Cor">
                  <Input type="color" value={editing.cor} onChange={(e) => setEditing({ ...editing, cor: e.target.value })} />
                </Field>
                <Field label="Status">
                  <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as "ativa" | "inativa" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="inativa">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button onClick={() => save.mutate(editing)} disabled={save.isPending || !editing.nome}>
                  {save.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </header>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.items ?? []).map((a) => (
            <div key={a.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg" style={{ background: a.cor }} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{a.nome}</div>
                <div className="text-[11px] text-muted-foreground">{a.tipo} · {a.status}</div>
                <div className="text-xs mt-1">Saldo inicial: <span className="font-mono">{fmtBRL(Number(a.saldo_inicial))}</span></div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(a as Acc)}><Pencil className="size-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(a.id)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
          {(data?.items ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">Nenhuma conta cadastrada.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
