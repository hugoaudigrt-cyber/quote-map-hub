import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Pencil, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({ meta: [{ title: "Produtos | Mapa de Cotações" }] }),
  component: ProdutosPage,
});

type Produto = Tables<"produtos">;

const empty = {
  codigo: "",
  descricao: "",
  unidade: "",
  categoria: "",
  observacoes: "",
};

function ProdutosPage() {
  const [list, setList] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Produto | null>(null);
  const [duplicate, setDuplicate] = useState<Produto | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .is("deleted_at", null)
      .order("descricao");
    if (error) toast.error("Erro ao carregar produtos");
    else setList(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter((p) =>
      [p.codigo, p.descricao, p.categoria]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [list, search]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }

  function openEdit(p: Produto) {
    setEditing(p);
    setForm({
      codigo: p.codigo ?? "",
      descricao: p.descricao ?? "",
      unidade: p.unidade ?? "",
      categoria: p.categoria ?? "",
      observacoes: p.observacoes ?? "",
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.codigo.trim()) return toast.error("Informe o código");
    if (!form.descricao.trim()) return toast.error("Informe a descrição");

    setSaving(true);

    const codigoTrim = form.codigo.trim().toUpperCase();

    const dupQuery = supabase
      .from("produtos")
      .select("*")
      .eq("codigo", codigoTrim)
      .maybeSingle();
    const { data: dup } = editing
      ? await supabase.from("produtos").select("*").eq("codigo", codigoTrim).neq("id", editing.id).maybeSingle()
      : await dupQuery;

    if (dup) {
      setDuplicate(dup as Produto);
      setSaving(false);
      return;
    }

    const payload: Omit<TablesInsert<"produtos">, "empresa_id"> = {
      codigo: codigoTrim,
      descricao: form.descricao.trim(),
      unidade: form.unidade || null,
      categoria: form.categoria || null,
      observacoes: form.observacoes || null,
    };

    if (editing) {
      const { error } = await supabase.from("produtos").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar: " + error.message);
      else { toast.success("Produto atualizado"); setOpen(false); load(); }
    } else {
      const { data: ue } = await supabase.from("usuarios").select("empresa_id").maybeSingle();
      if (!ue) { toast.error("Empresa não encontrada"); setSaving(false); return; }
      const { error } = await supabase.from("produtos").insert({ ...payload, empresa_id: ue.empresa_id });
      if (error) {
        if (error.code === "23505") toast.error("Código já cadastrado nesta empresa");
        else toast.error("Erro ao criar: " + error.message);
      } else { toast.success("Produto criado"); setOpen(false); load(); }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("produtos").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Produto excluído"); load(); }
    setDeleteTarget(null);
  }

  function openDuplicate() {
    if (!duplicate) return;
    const d = duplicate;
    setDuplicate(null);
    openEdit(d);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Produtos</h1>
            <p className="text-sm text-muted-foreground">Cadastro e gestão de produtos para cotação.</p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Lista de produtos</CardTitle>
              <CardDescription>{list.length} {list.length === 1 ? "produto cadastrado" : "produtos cadastrados"}.</CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descrição ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {list.length === 0 ? "Nenhum produto cadastrado ainda." : "Nenhum resultado para a busca."}
                  </TableCell></TableRow>
                ) : filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-medium">{p.codigo}</TableCell>
                    <TableCell>{p.descricao}</TableCell>
                    <TableCell>{p.unidade || "—"}</TableCell>
                    <TableCell>{p.categoria || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(p)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>Preencha os dados do produto.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} required />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="Ex: UN, KG, M, M2" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Descrição *</Label>
                <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Categoria</Label>
                <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Material de construção, Elétrica, Hidráulica" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Observações</Label>
                <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!duplicate} onOpenChange={(o) => !o && setDuplicate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Código já cadastrado</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um produto com este código: <strong>{duplicate?.codigo}</strong> — {duplicate?.descricao}.
              Deseja abrir o cadastro existente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction onClick={openDuplicate}>Abrir cadastro existente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.descricao}</strong> ({deleteTarget?.codigo})? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
