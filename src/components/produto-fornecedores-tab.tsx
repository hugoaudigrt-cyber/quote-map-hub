import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEnsureEmpresa } from "@/hooks/use-empresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Fornecedor = { id: string; razao_social: string; nome_fantasia: string | null };

type Vinculo = {
  id: string;
  fornecedor_id: string;
  preco: number | null;
  prazo_entrega: string | null;
  marca: string | null;
  codigo_fornecedor: string | null;
  observacoes: string | null;
  data_ultima_atualizacao: string;
  status: string;
  fornecedor: Fornecedor | null;
};

const emptyForm = {
  fornecedor_id: "",
  preco: "",
  prazo_entrega: "",
  marca: "",
  codigo_fornecedor: "",
  observacoes: "",
  status: "ativo",
};

const brl = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProdutoFornecedoresTab({ produtoId }: { produtoId: string }) {
  const ensureEmpresa = useEnsureEmpresa();
  const [list, setList] = useState<Vinculo[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vinculo | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vinculo | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: links, error }, { data: forns }] = await Promise.all([
      supabase
        .from("produto_fornecedor")
        .select(
          "id, fornecedor_id, preco, prazo_entrega, marca, codigo_fornecedor, observacoes, data_ultima_atualizacao, status, fornecedor:fornecedores(id, razao_social, nome_fantasia)",
        )
        .eq("produto_id", produtoId)
        .is("deleted_at", null)
        .order("data_ultima_atualizacao", { ascending: false }),
      supabase
        .from("fornecedores")
        .select("id, razao_social, nome_fantasia")
        .is("deleted_at", null)
        .order("razao_social"),
    ]);
    if (error) toast.error("Erro ao carregar fornecedores do produto");
    setList(((links ?? []) as unknown as Vinculo[]));
    setFornecedores((forns ?? []) as Fornecedor[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoId]);

  const availableFornecedores = useMemo(() => {
    if (editing) return fornecedores;
    const used = new Set(list.map((l) => l.fornecedor_id));
    return fornecedores.filter((f) => !used.has(f.id));
  }, [fornecedores, list, editing]);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(v: Vinculo) {
    setEditing(v);
    setForm({
      fornecedor_id: v.fornecedor_id,
      preco: v.preco == null ? "" : String(v.preco),
      prazo_entrega: v.prazo_entrega ?? "",
      marca: v.marca ?? "",
      codigo_fornecedor: v.codigo_fornecedor ?? "",
      observacoes: v.observacoes ?? "",
      status: v.status ?? "ativo",
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fornecedor_id) return toast.error("Selecione um fornecedor");
    const precoNum = form.preco === "" ? null : Number(form.preco);
    if (precoNum !== null && Number.isNaN(precoNum)) return toast.error("Preço inválido");

    setSaving(true);
    const payload = {
      fornecedor_id: form.fornecedor_id,
      preco: precoNum,
      prazo_entrega: form.prazo_entrega || null,
      marca: form.marca || null,
      codigo_fornecedor: form.codigo_fornecedor || null,
      observacoes: form.observacoes || null,
      status: form.status || "ativo",
      data_ultima_atualizacao: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from("produto_fornecedor").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar: " + error.message);
      else { toast.success("Fornecedor atualizado"); setOpen(false); load(); }
    } else {
      const empresaId = await ensureEmpresa();
      const { error } = await supabase
        .from("produto_fornecedor")
        .insert({ ...payload, produto_id: produtoId, empresa_id: empresaId });
      if (error) {
        if (error.code === "23505") toast.error("Este fornecedor já está vinculado a este produto");
        else toast.error("Erro ao vincular: " + error.message);
      } else { toast.success("Fornecedor vinculado"); setOpen(false); load(); }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("produto_fornecedor")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteTarget.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Vínculo removido"); load(); }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Fornecedores deste Produto</h3>
          <p className="text-xs text-muted-foreground">
            {list.length} {list.length === 1 ? "fornecedor vinculado" : "fornecedores vinculados"}.
          </p>
        </div>
        <Button size="sm" onClick={openNew} disabled={availableFornecedores.length === 0}>
          <Plus className="h-4 w-4" /> Adicionar fornecedor
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Prazo de entrega</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Última atualização</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                Nenhum fornecedor vinculado ainda.
              </TableCell></TableRow>
            ) : list.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">
                  {v.fornecedor?.nome_fantasia || v.fornecedor?.razao_social || "—"}
                </TableCell>
                <TableCell>{brl(v.preco == null ? null : Number(v.preco))}</TableCell>
                <TableCell>{v.prazo_entrega || "—"}</TableCell>
                <TableCell>{v.marca || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(v.data_ultima_atualizacao).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(v)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar vínculo" : "Adicionar fornecedor"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados deste fornecedor para o produto." : "Selecione um fornecedor já cadastrado e informe as condições."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Select
                value={form.fornecedor_id}
                onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}
                disabled={!!editing}
              >
                <SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger>
                <SelectContent>
                  {availableFornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome_fantasia || f.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo de entrega</Label>
                <Input
                  value={form.prazo_entrega}
                  onChange={(e) => setForm({ ...form, prazo_entrega: e.target.value })}
                  placeholder="Ex: 5 dias úteis"
                />
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Código no fornecedor</Label>
                <Input
                  value={form.codigo_fornecedor}
                  onChange={(e) => setForm({ ...form, codigo_fornecedor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Observações</Label>
                <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.fornecedor?.nome_fantasia || deleteTarget?.fornecedor?.razao_social}</strong> deste produto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
