import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Pencil, Trash2, Search, X } from "lucide-react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/solicitacoes")({
  head: () => ({ meta: [{ title: "Solicitações de Compra | Mapa de Cotações" }] }),
  component: SolicitacoesPage,
});

type Solicitacao = Tables<"solicitacoes">;
type Obra = Tables<"obras">;
type Produto = Tables<"produtos">;
type Status = "aberta" | "em_cotacao" | "finalizada" | "cancelada";

type ItemDraft = {
  id?: string;
  produto_id: string;
  quantidade: string;
  observacoes: string;
};

const STATUS_LABEL: Record<Status, string> = {
  aberta: "Aberta",
  em_cotacao: "Em cotação",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  aberta: "default",
  em_cotacao: "secondary",
  finalizada: "outline",
  cancelada: "destructive",
};

type Row = Solicitacao & { obras: { codigo: string; nome: string } | null; itens_count: number };

function SolicitacoesPage() {
  const ensureEmpresa = useEnsureEmpresa();
  const [list, setList] = useState<Row[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [prodForn, setProdForn] = useState<Record<string, { nome: string; preco: number | null }[]>>({});

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | Status>("todos");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Solicitacao | null>(null);
  const [form, setForm] = useState({ obra_id: "", status: "aberta" as Status, observacoes: "" });
  const [itens, setItens] = useState<ItemDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Solicitacao | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: sols, error }, { data: ob }, { data: pr }, { data: pf }] = await Promise.all([
      supabase
        .from("solicitacoes")
        .select("*, obras(codigo, nome), solicitacao_itens(id)")
        .is("deleted_at", null)
        .order("codigo", { ascending: false }),
      supabase.from("obras").select("*").is("deleted_at", null).order("codigo", { ascending: false }),
      supabase.from("produtos").select("*").is("deleted_at", null).order("descricao"),
      supabase
        .from("produto_fornecedor")
        .select("produto_id, preco, fornecedor:fornecedores(razao_social, nome_fantasia)")
        .is("deleted_at", null),
    ]);
    if (error) toast.error("Erro ao carregar solicitações");
    else {
      const rows = (sols ?? []).map((s: any) => ({
        ...s,
        itens_count: Array.isArray(s.solicitacao_itens) ? s.solicitacao_itens.length : 0,
      })) as Row[];
      setList(rows);
    }
    setObras((ob ?? []) as Obra[]);
    setProdutos((pr ?? []) as Produto[]);

    const map: Record<string, { nome: string; preco: number | null }[]> = {};
    (pf ?? []).forEach((r: any) => {
      const nome = r.fornecedor?.nome_fantasia || r.fornecedor?.razao_social || "Fornecedor";
      const preco = r.preco == null ? null : Number(r.preco);
      (map[r.produto_id] ||= []).push({ nome, preco });
    });
    setProdForn(map);
    setLoading(false);
  }


  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return list.filter((s) => {
      if (statusFilter !== "todos" && s.status !== statusFilter) return false;
      if (!q) return true;
      return [s.codigo, s.obras?.codigo, s.obras?.nome]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [list, search, statusFilter]);

  function openNew() {
    if (obras.length === 0) {
      toast.error("Cadastre uma obra primeiro");
      return;
    }
    setEditing(null);
    setForm({ obra_id: obras[0].id, status: "aberta", observacoes: "" });
    setItens([{ produto_id: "", quantidade: "", observacoes: "" }]);
    setOpen(true);
  }

  async function openEdit(s: Solicitacao) {
    setEditing(s);
    setForm({
      obra_id: s.obra_id,
      status: s.status as Status,
      observacoes: s.observacoes ?? "",
    });
    const { data } = await supabase
      .from("solicitacao_itens")
      .select("*")
      .eq("solicitacao_id", s.id)
      .order("created_at");
    setItens(
      (data ?? []).map((i: any) => ({
        id: i.id,
        produto_id: i.produto_id,
        quantidade: String(i.quantidade),
        observacoes: i.observacoes ?? "",
      })),
    );
    if (!data || data.length === 0) setItens([{ produto_id: "", quantidade: "", observacoes: "" }]);
    setOpen(true);
  }

  function addItem() {
    setItens([...itens, { produto_id: "", quantidade: "", observacoes: "" }]);
  }
  function removeItem(idx: number) {
    setItens(itens.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItens(itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.obra_id) return toast.error("Selecione a obra");

    const validItens = itens.filter((i) => i.produto_id && Number(i.quantidade) > 0);
    if (validItens.length === 0) return toast.error("Adicione ao menos um item válido");

    setSaving(true);

    let solicitacaoId = editing?.id;

    if (editing) {
      const { error } = await supabase
        .from("solicitacoes")
        .update({ obra_id: form.obra_id, status: form.status, observacoes: form.observacoes || null })
        .eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); setSaving(false); return; }
    } else {
      const empresaId = await ensureEmpresa();
      const insert: TablesInsert<"solicitacoes"> = {
        empresa_id: empresaId,
        obra_id: form.obra_id,
        status: form.status,
        observacoes: form.observacoes || null,
        codigo: "",
      };
      const { data, error } = await supabase.from("solicitacoes").insert(insert).select("id").single();
      if (error || !data) { toast.error("Erro ao criar: " + (error?.message ?? "")); setSaving(false); return; }
      solicitacaoId = data.id;
    }

    if (editing) {
      const keepIds = validItens.filter((i) => i.id).map((i) => i.id!);
      const deleteQuery = supabase.from("solicitacao_itens").delete().eq("solicitacao_id", editing.id);
      if (keepIds.length > 0) await deleteQuery.not("id", "in", `(${keepIds.join(",")})`);
      else await deleteQuery;

      for (const it of validItens) {
        const payload = {
          produto_id: it.produto_id,
          quantidade: Number(it.quantidade),
          observacoes: it.observacoes || null,
        };
        if (it.id) {
          await supabase.from("solicitacao_itens").update(payload).eq("id", it.id);
        } else {
          await supabase.from("solicitacao_itens").insert({ ...payload, solicitacao_id: editing.id });
        }
      }
    } else if (solicitacaoId) {
      const payload = validItens.map((it) => ({
        solicitacao_id: solicitacaoId!,
        produto_id: it.produto_id,
        quantidade: Number(it.quantidade),
        observacoes: it.observacoes || null,
      }));
      const { error } = await supabase.from("solicitacao_itens").insert(payload);
      if (error) toast.error("Solicitação criada, mas erro nos itens: " + error.message);
    }

    // Sincronizar status dos mapas vinculados ao editar
    if (editing && (form.status === "finalizada" || form.status === "cancelada")) {
      const novoStatusMapa = form.status === "finalizada" ? "finalizado" : "cancelado";
      const { data: mapasVinc } = await supabase
        .from("mapas_cotacao")
        .select("id")
        .eq("solicitacao_id", editing.id)
        .is("deleted_at", null);
      const ids = (mapasVinc ?? []).map((m) => m.id);
      if (ids.length > 0) {
        const { error: updErr } = await supabase
          .from("mapas_cotacao")
          .update({ status: novoStatusMapa })
          .in("id", ids);
        if (!updErr) {
          toast.info(
            `Solicitação ${form.status === "finalizada" ? "finalizada" : "cancelada"}. ${ids.length} ${ids.length === 1 ? "mapa de cotação atualizado" : "mapas de cotação atualizados"} para '${novoStatusMapa}'.`,
          );
        }
      }
    }

    toast.success(editing ? "Solicitação atualizada" : "Solicitação criada");
    setOpen(false);
    load();
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("solicitacoes").update({ deleted_at: new Date().toISOString() }).eq("id", deleteTarget.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Solicitação excluída"); load(); }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Solicitações de Compra</h1>
            <p className="text-sm text-muted-foreground">Crie pedidos de compra vinculados às obras.</p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Nova solicitação
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Lista de solicitações</CardTitle>
              <CardDescription>{list.length} {list.length === 1 ? "solicitação" : "solicitações"}.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_cotacao">Em cotação</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por código ou obra..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
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
                  <TableHead>Obra</TableHead>
                  <TableHead className="w-[100px]">Itens</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[160px]">Criada em</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {list.length === 0 ? "Nenhuma solicitação cadastrada ainda." : "Nenhum resultado."}
                  </TableCell></TableRow>
                ) : filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs font-medium">{s.codigo}</TableCell>
                    <TableCell>
                      {s.obras ? <span><span className="font-mono text-xs text-muted-foreground">{s.obras.codigo}</span> · {s.obras.nome}</span> : "—"}
                    </TableCell>
                    <TableCell>{s.itens_count}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[s.status as Status]}>{STATUS_LABEL[s.status as Status]}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(s)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar solicitação ${editing.codigo}` : "Nova solicitação"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize a solicitação e seus itens." : "O código será gerado automaticamente (SOL-0001)."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Obra *</Label>
                <Select value={form.obra_id} onValueChange={(v) => setForm({ ...form, obra_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {obras.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.codigo} · {o.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="em_cotacao">Em cotação</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Observações</Label>
                <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Itens</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4" /> Adicionar item
                </Button>
              </div>

              {produtos.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-md border border-dashed p-4 text-center">
                  Nenhum produto cadastrado. Cadastre produtos para adicioná-los.
                </p>
              ) : (
                <div className="space-y-2">
                  {itens.map((it, idx) => {
                    const linked = it.produto_id ? prodForn[it.produto_id] ?? [] : [];
                    return (
                      <div key={idx} className="space-y-2 rounded-md border p-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_120px_1fr_auto]">
                          <div className="space-y-1">
                            <Label className="text-xs">Produto</Label>
                            <Select value={it.produto_id} onValueChange={(v) => updateItem(idx, { produto_id: v })}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {produtos.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.codigo} · {p.descricao}{p.unidade ? ` (${p.unidade})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Quantidade</Label>
                            <Input
                              type="number" step="0.01" min="0"
                              value={it.quantidade}
                              onChange={(e) => updateItem(idx, { quantidade: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Observações</Label>
                            <Input value={it.observacoes} onChange={(e) => updateItem(idx, { observacoes: e.target.value })} />
                          </div>
                          <div className="flex items-end">
                            <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={itens.length === 1}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {it.produto_id && (
                          <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs">
                            {linked.length === 0 ? (
                              <span className="text-muted-foreground">Nenhum fornecedor vinculado a este produto.</span>
                            ) : (
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                <span className="text-muted-foreground">Fornecedores vinculados:</span>
                                {linked.map((f, i) => (
                                  <span key={i} className="font-medium">
                                    {f.nome}
                                    {f.preco != null && (
                                      <span className="text-muted-foreground font-normal"> · {f.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
            <AlertDialogTitle>Excluir solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.codigo}</strong>? Os itens também serão removidos.
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
