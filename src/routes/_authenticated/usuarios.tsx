import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { createUsuarioEmpresa, deleteUsuarioEmpresa, updateUsuarioEmpresa } from "@/lib/empresa.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários | Mapa de Cotações" }] }),
  component: UsuariosPage,
});

type Usuario = Tables<"usuarios">;

const empty = { nome: "", email: "", cargo: "", password: "" };

function UsuariosPage() {
  const createUsuario = useServerFn(createUsuarioEmpresa);
  const updateUsuario = useServerFn(updateUsuarioEmpresa);
  const deleteUsuario = useServerFn(deleteUsuarioEmpresa);
  const [list, setList] = useState<Usuario[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: auth }, { data, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("usuarios").select("*").is("deleted_at", null).order("nome"),
    ]);
    setCurrentUserId(auth.user?.id ?? null);
    if (error) toast.error("Erro ao carregar usuários");
    else setList((data ?? []) as Usuario[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter((u) => [u.nome, u.email, u.cargo].filter(Boolean).some((v) => v!.toLowerCase().includes(q)));
  }, [list, search]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }

  function openEdit(usuario: Usuario) {
    setEditing(usuario);
    setForm({ nome: usuario.nome, email: usuario.email, cargo: usuario.cargo ?? "", password: "" });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome");
    if (!form.email.trim()) return toast.error("Informe o e-mail");
    if (!editing && form.password.length < 6) return toast.error("Informe uma senha com ao menos 6 caracteres");

    setSaving(true);
    try {
      if (editing) {
        await updateUsuario({ data: { id: editing.id, nome: form.nome, email: form.email, cargo: form.cargo } });
        toast.success("Usuário atualizado");
      } else {
        await createUsuario({ data: form });
        toast.success("Usuário criado e vinculado à empresa");
      }
      setOpen(false);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteUsuario({ data: { id: deleteTarget.id } });
      toast.success("Usuário inativado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao inativar usuário");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie os acessos vinculados à sua empresa.</p>
          </div>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo usuário</Button>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Lista de usuários</CardTitle>
              <CardDescription>{list.length} {list.length === 1 ? "usuário ativo" : "usuários ativos"}.</CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</TableCell></TableRow>
                ) : filtered.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">{usuario.nome}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>{usuario.cargo || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(usuario)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" disabled={usuario.id === currentUserId} onClick={() => setDeleteTarget(usuario)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>{editing ? "Atualize os dados do usuário." : "O novo usuário será vinculado à sua empresa."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>E-mail *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
              </div>
              {!editing && (
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
                </div>
              )}
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
            <AlertDialogTitle>Inativar usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar <strong>{deleteTarget?.nome}</strong>? O histórico será mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
