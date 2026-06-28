import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, Pencil, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/obras")({
  head: () => ({ meta: [{ title: "Obras | Mapa de Cotações" }] }),
  component: ObrasPage,
});

type Obra = Tables<"obras">;
type Status = "ativa" | "pausada" | "finalizada";

const empty = {
  nome: "",
  cliente: "",
  local: "",
  status: "ativa" as Status,
};

const STATUS_LABEL: Record<Status, string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  finalizada: "Finalizada",
};

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "outline"> = {
  ativa: "default",
  pausada: "secondary",
  finalizada: "outline",
};

function ObrasPage() {
  const [list, setList] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | Status>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Obra | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Obra | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("obras")
      .select("*")
      .is("deleted_at", null)
      .order("codigo", { ascending: false });
    if (error) toast.error("Erro ao carregar obras");
    else setList((data ?? []) as Obra[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return list.filter((o) => {
      if (statusFilter !== "todos" && o.status !== statusFilter) return false;
      if (!q) return true;
      return [o.codigo, o.nome, o.cliente, o.local]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [list, search, statusFilter]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }

  function openEdit(o: Obra) {
    setEditing(o);
    setForm({
      nome: o.nome ?? "",
      cliente: o.cliente ?? "",
      local: o.local ?? "",
      status: (o.status as Status) ?? "ativa",
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome da obra");

    setSaving(true);

    const payload = {
      nome: form.nome.trim(),
      cliente: form.cliente.trim() || null,
      local: form.local.trim() || null,
      status: form.status,
    };

    if (editing) {
      const { error } = await supabase.from("obras").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar: " + error.message);
      else { toast.success("Obra atualizada"); setOpen(false); load(); }
    } else {
      const { data: ue } = await supabase.from("usuarios").select("empresa_id").maybeSingle();
      if (!ue) { toast.error("Empresa não encontrada"); setSaving(false); return; }
      const insert: TablesInsert<"obras"> = { ...payload, empresa_id: ue.empresa_id, codigo: "" };
      const { error } = await supabase.from("obras").insert(insert);
      if (error) toast.error("Erro ao criar: " + error.message);
      else { toast.success("Obra criada"); setOpen(false); load(); }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("obras").update({ deleted_at: new Date().toISOString() }).eq("id", deleteTarget.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Obra excluída"); load(); }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Obras</h1>
            <p className="text-sm text-muted-foreground">Gerencie as obras da sua empresa.</p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Nova obra
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Lista de obras</CardTitle>
              <CardDescription>{list.length} {list.length === 1 ? "obra cadastrada" : "obras cadastradas"}.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nome, cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {list.length === 0 ? "Nenhuma obra cadastrada ainda." : "Nenhum resultado para a busca."}
                  </TableCell></TableRow>
                ) : filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs font-medium">{o.codigo}</TableCell>
                    <TableCell className="font-medium">{o.nome}</TableCell>
                    <TableCell>{o.cliente || "—"}</TableCell>
                    <TableCell>{o.local || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[o.status as Status]}>{STATUS_LABEL[o.status as Status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(o)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editing ? `Editar obra ${editing.codigo}` : "Nova obra"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize as informações da obra." : "O código será gerado automaticamente (OBR-0001)."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Endereço ou cidade da obra" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
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
            <AlertDialogTitle>Excluir obra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong> ({deleteTarget?.codigo})? Essa ação não pode ser desfeita.
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
