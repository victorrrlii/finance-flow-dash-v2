import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  deleteCategory, deleteSubcategory, listCategories,
  upsertCategory, upsertSubcategory,
} from "@/lib/manage.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({ meta: [{ title: "Categorias — Central Financeira" }] }),
  component: CategoriesPage,
});

interface Cat { id?: string; nome: string; cor: string; tipo: "Receita" | "Despesa" | "Ambos" }
interface Sub { id?: string; category_id: string; nome: string }

function CategoriesPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listCategories);
  const saveCat = useServerFn(upsertCategory);
  const delCat = useServerFn(deleteCategory);
  const saveSub = useServerFn(upsertSubcategory);
  const delSub = useServerFn(deleteSubcategory);

  const { data, isLoading } = useQuery({ queryKey: ["categories"], queryFn: () => fetchFn() });

  const [editingCat, setEditingCat] = useState<Cat | null>(null);
  const [editingSub, setEditingSub] = useState<Sub | null>(null);

  const inval = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const mCat = useMutation({
    mutationFn: (v: Cat) => saveCat({ data: v }),
    onSuccess: () => { inval(); toast.success("Categoria salva."); setEditingCat(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mDelCat = useMutation({ mutationFn: (id: string) => delCat({ data: { id } }), onSuccess: inval });
  const mSub = useMutation({
    mutationFn: (v: Sub) => saveSub({ data: v }),
    onSuccess: () => { inval(); setEditingSub(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mDelSub = useMutation({ mutationFn: (id: string) => delSub({ data: { id } }), onSuccess: inval });

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;

  const cats = data?.categories ?? [];
  const subs = data?.subcategories ?? [];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gradient-primary">Categorias</h1>
          <p className="text-xs text-muted-foreground">Crie categorias e subcategorias livremente.</p>
        </div>
        <Button onClick={() => setEditingCat({ nome: "", cor: "#A855F7", tipo: "Ambos" })} className="gap-1">
          <Plus className="size-4" /> Nova categoria
        </Button>
      </header>

      <div className="space-y-3">
        {cats.map((c) => {
          const mySubs = subs.filter((s) => s.category_id === c.id);
          return (
            <div key={c.id} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-md" style={{ background: c.cor }} />
                <div className="flex-1">
                  <div className="font-semibold text-sm">{c.nome}</div>
                  <div className="text-[11px] text-muted-foreground">{c.tipo}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditingCat(c as Cat)}><Pencil className="size-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => mDelCat.mutate(c.id)}><Trash2 className="size-4" /></Button>
              </div>
              <div className="ml-11 mt-3 flex flex-wrap gap-2">
                {mySubs.map((s) => (
                  <span key={s.id} className="text-xs bg-muted/40 rounded-full pl-3 pr-1 py-1 flex items-center gap-1">
                    {s.nome}
                    <button onClick={() => mDelSub.mutate(s.id)} className="size-4 rounded-full hover:bg-destructive/20 flex items-center justify-center"><Trash2 className="size-3" /></button>
                  </span>
                ))}
                <button
                  onClick={() => setEditingSub({ category_id: c.id, nome: "" })}
                  className="text-xs border border-dashed border-border rounded-full px-3 py-1 text-muted-foreground hover:text-foreground"
                >+ subcategoria</button>
              </div>
            </div>
          );
        })}
        {cats.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>}
      </div>

      <Dialog open={!!editingCat} onOpenChange={(o) => !o && setEditingCat(null)}>
        {editingCat && (
          <DialogContent>
            <DialogHeader><DialogTitle>{editingCat.id ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Nome</Label><Input value={editingCat.nome} onChange={(e) => setEditingCat({ ...editingCat, nome: e.target.value })} /></div>
              <div><Label className="text-xs">Cor</Label><Input type="color" value={editingCat.cor} onChange={(e) => setEditingCat({ ...editingCat, cor: e.target.value })} /></div>
              <div><Label className="text-xs">Tipo</Label>
                <Select value={editingCat.tipo} onValueChange={(v) => setEditingCat({ ...editingCat, tipo: v as Cat["tipo"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita">Receita</SelectItem>
                    <SelectItem value="Despesa">Despesa</SelectItem>
                    <SelectItem value="Ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditingCat(null)}>Cancelar</Button>
              <Button onClick={() => mCat.mutate(editingCat)} disabled={!editingCat.nome}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!editingSub} onOpenChange={(o) => !o && setEditingSub(null)}>
        {editingSub && (
          <DialogContent>
            <DialogHeader><DialogTitle>Nova subcategoria</DialogTitle></DialogHeader>
            <div><Label className="text-xs">Nome</Label><Input value={editingSub.nome} onChange={(e) => setEditingSub({ ...editingSub, nome: e.target.value })} /></div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditingSub(null)}>Cancelar</Button>
              <Button onClick={() => mSub.mutate(editingSub)} disabled={!editingSub.nome}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
