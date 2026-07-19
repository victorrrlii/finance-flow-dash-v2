import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createTransaction } from "@/lib/transactions.functions";
import { listAccounts, listCategories, upsertCategory, upsertSubcategory } from "@/lib/manage.functions";
import type { TipoEfetivo } from "@/lib/types";

const FORMAS = ["PIX", "Dinheiro", "Débito", "Crédito", "Boleto", "Transferência"];
const STATUSES = ["Confirmado", "Pendente", "Agendado"];

export function NewTransactionDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  const accountsFn = useServerFn(listAccounts);
  const catsFn = useServerFn(listCategories);
  const createFn = useServerFn(createTransaction);
  const upCat = useServerFn(upsertCategory);
  const upSub = useServerFn(upsertSubcategory);

  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: () => accountsFn(), enabled: open });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: () => catsFn(), enabled: open });

  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: "Despesa" as "Receita" | "Despesa",
    tipo_efetivo: "Despesa" as TipoEfetivo,
    valor: "",
    account_id: "",
    category_id: "",
    subcategory_id: "",
    forma_pagto: "",
    descricao: "",
    status: "Confirmado",
    observacoes: "",
    realizado: true,
  });

  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewSub, setShowNewSub] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
    }
  }, [open]);

  const subs = useMemo(
    () => (catsQ.data?.subcategories ?? []).filter((s) => s.category_id === form.category_id),
    [catsQ.data, form.category_id],
  );

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const createCatMut = useMutation({
    mutationFn: async () => {
      const tipo = form.tipo === "Receita" ? "Receita" : "Despesa";
      await upCat({ data: { nome: newCatName.trim(), cor: "#A855F7", tipo } });
    },
    onSuccess: async () => {
      const res = await qc.fetchQuery({ queryKey: ["categories"], queryFn: () => catsFn() });
      const created = res.categories.find((c) => c.nome === newCatName.trim());
      if (created) set("category_id", created.id);
      setNewCatName("");
      setShowNewCat(false);
      toast.success("Categoria criada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createSubMut = useMutation({
    mutationFn: async () => {
      if (!form.category_id) throw new Error("Selecione uma categoria primeiro.");
      await upSub({ data: { category_id: form.category_id, nome: newSubName.trim() } });
    },
    onSuccess: async () => {
      const res = await qc.fetchQuery({ queryKey: ["categories"], queryFn: () => catsFn() });
      const created = res.subcategories.find((s) => s.nome === newSubName.trim() && s.category_id === form.category_id);
      if (created) set("subcategory_id", created.id);
      setNewSubName("");
      setShowNewSub(false);
      toast.success("Subcategoria criada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const valor = Number(form.valor.replace(",", "."));
      if (!Number.isFinite(valor) || valor <= 0) throw new Error("Valor inválido.");
      if (!form.descricao.trim()) throw new Error("Descrição obrigatória.");
      if (!form.data) throw new Error("Data obrigatória.");
      const cat = catsQ.data?.categories.find((c) => c.id === form.category_id);
      const sub = catsQ.data?.subcategories.find((s) => s.id === form.subcategory_id);
      const acc = accountsQ.data?.items.find((a) => a.id === form.account_id);
      await createFn({
        data: {
          data: form.data,
          tipo: form.tipo,
          tipo_efetivo: form.tipo_efetivo,
          valor,
          categoria: cat?.nome ?? null,
          subcategoria: sub?.nome ?? null,
          conta: acc?.nome ?? null,
          forma_pagto: form.forma_pagto || null,
          descricao: form.descricao.trim(),
          status: form.status || null,
          observacoes: form.observacoes.trim() || null,
          account_id: form.account_id || null,
          category_id: form.category_id || null,
          subcategory_id: form.subcategory_id || null,
          realizado: form.realizado,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Lançamento criado.");
      setOpen(false);
      setForm((f) => ({ ...f, valor: "", descricao: "", observacoes: "" }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Nomes para exibição na aba de revisão
  const selectedAccName = useMemo(() => {
    return accountsQ.data?.items.find((a) => a.id === form.account_id)?.nome ?? "Nenhuma";
  }, [accountsQ.data, form.account_id]);

  const selectedCatName = useMemo(() => {
    return catsQ.data?.categories.find((c) => c.id === form.category_id)?.nome ?? "Nenhuma";
  }, [catsQ.data, form.category_id]);

  const selectedSubcatName = useMemo(() => {
    return catsQ.data?.subcategories.find((s) => s.id === form.subcategory_id)?.nome ?? "Nenhuma";
  }, [catsQ.data, form.subcategory_id]);

  const nextStep = () => {
    if (step === 1) {
      if (!form.data) {
        toast.error("Por favor, preencha a data.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const v = Number(form.valor.replace(",", "."));
      if (!form.valor || isNaN(v) || v <= 0) {
        toast.error("Por favor, preencha um valor válido maior que zero.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!form.descricao.trim()) {
        toast.error("Por favor, preencha a descrição.");
        return;
      }
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    } else if (step === 5) {
      setStep(6);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="size-3" /> Novo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center pr-6">
            <span>Novo lançamento</span>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Passo {step} de 6
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="w-full bg-muted h-1 rounded-full overflow-hidden mb-4">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>

        <div className="py-2 space-y-4">
          {/* Passo 1: Data */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-1 duration-200">
              <div className="text-sm font-medium text-muted-foreground">Qual a data do lançamento?</div>
              <Field label="Data *">
                <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} className="text-sm" />
              </Field>
            </div>
          )}

          {/* Passo 2: Valor */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-1 duration-200">
              <div className="text-sm font-medium text-muted-foreground">Qual o valor do lançamento?</div>
              <Field label="Valor (R$) *">
                <Input
                  inputMode="decimal"
                  placeholder="0,00"
                  autoFocus
                  value={form.valor}
                  onChange={(e) => set("valor", e.target.value)}
                  className="text-base font-semibold"
                />
              </Field>
            </div>
          )}

          {/* Passo 3: Descrição e Tipo */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-1 duration-200">
              <div className="text-sm font-medium text-muted-foreground">Dê uma descrição e defina o tipo:</div>
              <Field label="Descrição *">
                <Input
                  value={form.descricao}
                  onChange={(e) => set("descricao", e.target.value)}
                  placeholder="Ex: Mercado, Salário..."
                  autoFocus
                  className="text-sm"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo *">
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => {
                      set("tipo", v as "Receita" | "Despesa");
                      set("tipo_efetivo", v as TipoEfetivo);
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Receita">Receita</SelectItem>
                      <SelectItem value="Despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tipo efetivo *">
                  <Select value={form.tipo_efetivo} onValueChange={(v) => set("tipo_efetivo", v as TipoEfetivo)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Receita", "Despesa", "Transferência", "Investimento"].map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {/* Passo 4: Conta, Forma e Categoria */}
          {step === 4 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-1 duration-200">
              <div className="text-sm font-medium text-muted-foreground">Classifique o lançamento (opcional):</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Conta">
                  <Select value={form.account_id} onValueChange={(v) => set("account_id", v)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(accountsQ.data?.items ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Forma de pagamento">
                  <Select value={form.forma_pagto} onValueChange={(v) => set("forma_pagto", v)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Categoria">
                <div className="space-y-1">
                  <Select
                    value={form.category_id}
                    onValueChange={(v) => {
                      set("category_id", v);
                      set("subcategory_id", "");
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(catsQ.data?.categories ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showNewCat ? (
                    <div className="flex gap-1 mt-1.5">
                      <Input
                        placeholder="Nome nova categoria"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={!newCatName.trim() || createCatMut.isPending}
                        onClick={() => createCatMut.mutate()}
                      >
                        OK
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewCat(false)}>
                        ×
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      className="h-6 px-0 text-xs"
                      onClick={() => setShowNewCat(true)}
                    >
                      + Nova categoria
                    </Button>
                  )}
                </div>
              </Field>

              <Field label="Subcategoria">
                <div className="space-y-1">
                  <Select
                    value={form.subcategory_id}
                    onValueChange={(v) => set("subcategory_id", v)}
                    disabled={!form.category_id}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={form.category_id ? "Selecione..." : "Escolha categoria"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subs.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showNewSub ? (
                    <div className="flex gap-1 mt-1.5">
                      <Input
                        placeholder="Nome nova subcategoria"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={!newSubName.trim() || !form.category_id || createSubMut.isPending}
                        onClick={() => createSubMut.mutate()}
                      >
                        OK
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewSub(false)}>
                        ×
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      className="h-6 px-0 text-xs"
                      disabled={!form.category_id}
                      onClick={() => setShowNewSub(true)}
                    >
                      + Nova subcategoria
                    </Button>
                  )}
                </div>
              </Field>
            </div>
          )}

          {/* Passo 5: Status, Realizado e Observações */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-1 duration-200">
              <div className="text-sm font-medium text-muted-foreground">Mais alguns detalhes:</div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Realizado">
                  <div className="flex items-center h-9 gap-2">
                    <Switch checked={form.realizado} onCheckedChange={(v) => set("realizado", v)} />
                    <span className="text-xs text-muted-foreground">
                      {form.realizado ? "Sim (Efetivado)" : "Não (Previsto)"}
                    </span>
                  </div>
                </Field>
              </div>

              <Field label="Observações">
                <Textarea rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} className="text-sm" />
              </Field>
            </div>
          )}

          {/* Passo 6: Revisão dos Dados antes do lançamento */}
          {step === 6 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-1 duration-200">
              <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Check className="size-4 text-[color:var(--success)]" />
                <span>Revise as informações antes de lançar:</span>
              </div>
              <div className="border border-border/60 rounded-lg overflow-hidden bg-muted/40 text-xs divide-y divide-border/40">
                <ReviewRow label="Data" value={form.data.split("-").reverse().join("/")} />
                <ReviewRow label="Valor" value={`R$ ${form.valor}`} className="font-semibold text-primary" />
                <ReviewRow label="Descrição" value={form.descricao} />
                <ReviewRow label="Tipo" value={`${form.tipo} (${form.tipo_efetivo})`} />
                <ReviewRow label="Conta" value={selectedAccName} />
                <ReviewRow label="Forma de Pagamento" value={form.forma_pagto || "Nenhuma"} />
                <ReviewRow label="Categoria" value={selectedCatName} />
                <ReviewRow label="Subcategoria" value={selectedSubcatName} />
                <ReviewRow label="Status" value={form.status} />
                <ReviewRow label="Realizado" value={form.realizado ? "Sim (Efetivado)" : "Não (Previsto)"} />
                {form.observacoes.trim() && <ReviewRow label="Observações" value={form.observacoes} />}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex sm:justify-between items-center gap-2">
          {step > 1 ? (
            <Button type="button" variant="outline" size="sm" onClick={prevStep} className="gap-1">
              <ChevronLeft className="size-3.5" /> Voltar
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          )}

          {step < 6 ? (
            <Button type="button" size="sm" onClick={nextStep} className="gap-1 ml-auto">
              Avançar <ChevronRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="ml-auto"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending ? "Salvando..." : "Confirmar e Lançar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between items-center p-2.5 hover:bg-muted/10 transition-colors">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className={`text-foreground truncate max-w-[240px] ${className}`}>{value}</span>
    </div>
  );
}
