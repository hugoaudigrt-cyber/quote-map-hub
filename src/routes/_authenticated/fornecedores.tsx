import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Truck, Plus, Pencil, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useEnsureEmpresa } from "@/hooks/use-empresa";
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

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores | Mapa de Cotações" }] }),
  component: FornecedoresPage,
});

type Fornecedor = Tables<"fornecedores">;

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const formatCnpj = (v: string) => {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const empty = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  telefone: "",
  whatsapp: "",
  email_comercial: "",
  email_financeiro: "",
  observacoes: "",
};

function FornecedoresPage() {
  const ensureEmpresa = useEnsureEmpresa();
  const [list, setList] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Fornecedor | null>(null);
  const [duplicate, setDuplicate] = useState<Fornecedor | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("fornecedores")
      .select("*")
      .is("deleted_at", null)
      .order("razao_social");
    if (error) toast.error("Erro ao carregar fornecedores");
    else setList(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter((f) =>
      [f.razao_social, f.nome_fantasia, f.cnpj, f.cidade, f.email_comercial]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [list, search]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }

  function openEdit(f: Fornecedor) {
    setEditing(f);
    setForm({
      razao_social: f.razao_social ?? "",
      nome_fantasia: f.nome_fantasia ?? "",
      cnpj: f.cnpj ?? "",
      endereco: f.endereco ?? "",
      cidade: f.cidade ?? "",
      estado: f.estado ?? "",
      cep: f.cep ?? "",
      telefone: f.telefone ?? "",
      whatsapp: f.whatsapp ?? "",
      email_comercial: f.email_comercial ?? "",
      email_financeiro: f.email_financeiro ?? "",
      observacoes: f.observacoes ?? "",
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.razao_social.trim()) return toast.error("Informe a razão social");
    const cnpjDigits = onlyDigits(form.cnpj);
    if (cnpjDigits.length !== 14) return toast.error("CNPJ deve ter 14 dígitos");

    setSaving(true);

    // Duplicate check (scoped by RLS to current empresa)
    const dupQuery = supabase
      .from("fornecedores")
      .select("*")
      .eq("cnpj", cnpjDigits)
      .is("deleted_at", null)
      .maybeSingle();
    const { data: dup } = editing
      ? await supabase.from("fornecedores").select("*").eq("cnpj", cnpjDigits).is("deleted_at", null).neq("id", editing.id).maybeSingle()
      : await dupQuery;

    if (dup) {
      setDuplicate(dup as Fornecedor);
      setSaving(false);
      return;
    }

    const payload: Omit<TablesInsert<"fornecedores">, "empresa_id"> = {
      razao_social: form.razao_social.trim(),
      nome_fantasia: form.nome_fantasia || null,
      cnpj: cnpjDigits,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      cep: form.cep || null,
      telefone: form.telefone || null,
      whatsapp: form.whatsapp || null,
      email_comercial: form.email_comercial || null,
      email_financeiro: form.email_financeiro || null,
      observacoes: form.observacoes || null,
    };

    if (editing) {
      const { error } = await supabase.from("fornecedores").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar: " + error.message);
      else { toast.success("Fornecedor atualizado"); setOpen(false); load(); }
    } else {
      const empresaId = await ensureEmpresa();
      const { error } = await supabase.from("fornecedores").insert({ ...payload, empresa_id: empresaId });
      if (error) {
        if (error.code === "23505") toast.error("CNPJ já cadastrado nesta empresa");
        else toast.error("Erro ao criar: " + error.message);
      } else { toast.success("Fornecedor criado"); setOpen(false); load(); }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("fornecedores").update({ deleted_at: new Date().toISOString() }).eq("id", deleteTarget.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Fornecedor excluído"); load(); }
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
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Fornecedores</h1>
            <p className="text-sm text-muted-foreground">Cadastro e gestão de fornecedores.</p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo fornecedor
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Lista de fornecedores</CardTitle>
              <CardDescription>{list.length} {list.length === 1 ? "fornecedor cadastrado" : "fornecedores cadastrados"}.</CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
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
                  <TableHead>Razão social</TableHead>
                  <TableHead>Nome fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {list.length === 0 ? "Nenhum fornecedor cadastrado ainda." : "Nenhum resultado para a busca."}
                  </TableCell></TableRow>
                ) : filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.razao_social}</TableCell>
                    <TableCell>{f.nome_fantasia || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{formatCnpj(f.cnpj)}</TableCell>
                    <TableCell>{[f.cidade, f.estado].filter(Boolean).join("/") || "—"}</TableCell>
                    <TableCell>{f.telefone || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(f)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
            <DialogDescription>Preencha os dados do fornecedor.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label>Razão social *</Label>
                <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Nome fantasia</Label>
                <Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ *</Label>
                <Input value={formatCnpj(form.cnpj)} onChange={(e) => setForm({ ...form, cnpj: onlyDigits(e.target.value) })} maxLength={18} required />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail comercial</Label>
                <Input type="email" value={form.email_comercial} onChange={(e) => setForm({ ...form, email_comercial: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail financeiro</Label>
                <Input type="email" value={form.email_financeiro} onChange={(e) => setForm({ ...form, email_financeiro: e.target.value })} />
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
            <AlertDialogTitle>CNPJ já cadastrado</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um fornecedor com este CNPJ: <strong>{duplicate?.razao_social}</strong>.
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
            <AlertDialogTitle>Excluir fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.razao_social}</strong>? Essa ação não pode ser desfeita.
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
