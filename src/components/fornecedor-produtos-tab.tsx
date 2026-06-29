import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, History, Trash2, Check, ChevronsUpDown, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type ProdutoLite = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  categoria: string | null;
  fabricante: string | null;
};

type LinhaProduto = {
  fornecedor_produto_id: string;
  produto: ProdutoLite;
  ultimo_preco: number | null;
  ultima_data: string | null;
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const today = () => new Date().toISOString().slice(0, 10);

export function FornecedorProdutosTab({ fornecedorId }: { fornecedorId: string }) {
  const ensureEmpresa = useEnsureEmpresa();
  const [rows, setRows] = useState<LinhaProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LinhaProduto | null>(null);
  const [historyTarget, setHistoryTarget] = useState<LinhaProduto | null>(null);
  const [removeTarget, setRemoveTarget] = useState<LinhaProduto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: links, error } = await supabase
      .from("fornecedor_produtos")
      .select("id, produto:produtos(id, codigo, descricao, unidade, categoria, fabricante)")
      .eq("fornecedor_id", fornecedorId)
      .is("deleted_at", null);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const linkIds = (links ?? []).map((l) => l.id);
    let precosByLink = new Map<string, { preco: number; data_vigencia: string }>();
    if (linkIds.length) {
      const { data: precos } = await supabase
        .from("fornecedor_produto_precos")
        .select("fornecedor_produto_id, preco, data_vigencia, created_at")
        .in("fornecedor_produto_id", linkIds)
        .order("data_vigencia", { ascending: false })
        .order("created_at", { ascending: false });
      (precos ?? []).forEach((p) => {
        if (!precosByLink.has(p.fornecedor_produto_id)) {
          precosByLink.set(p.fornecedor_produto_id, {
            preco: Number(p.preco),
            data_vigencia: p.data_vigencia,
          });
        }
      });
    }
    const result: LinhaProduto[] = (links ?? [])
      .filter((l) => l.produto)
      .map((l) => {
        const p = precosByLink.get(l.id);
        return {
          fornecedor_produto_id: l.id,
          produto: l.produto as unknown as ProdutoLite,
          ultimo_preco: p?.preco ?? null,
          ultima_data: p?.data_vigencia ?? null,
        };
      })
      .sort((a, b) => a.produto.descricao.localeCompare(b.produto.descricao));
    setRows(result);
    setLoading(false);
  }, [fornecedorId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemove() {
    if (!removeTarget) return;
    const { error } = await supabase
      .from("fornecedor_produtos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", removeTarget.fornecedor_produto_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Vínculo removido");
      load();
    }
    setRemoveTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "produto vinculado" : "produtos vinculados"} a este fornecedor.
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar produto
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Un.</TableHead>
              <TableHead className="text-right">Último preço</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                Nenhum produto vinculado. Clique em "Adicionar produto".
              </TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.fornecedor_produto_id}>
                <TableCell>
                  <div className="font-medium">{r.produto.descricao}</div>
                  <div className="text-xs text-muted-foreground font-mono">{r.produto.codigo}</div>
                </TableCell>
                <TableCell>{r.produto.categoria || "—"}</TableCell>
                <TableCell>{r.produto.unidade || "—"}</TableCell>
                <TableCell className="text-right font-medium">
                  {r.ultimo_preco !== null ? fmtBRL(r.ultimo_preco) : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.ultima_data ? new Date(r.ultima_data + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Editar preço" onClick={() => setEditTarget(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Ver histórico" onClick={() => setHistoryTarget(r)}>
                      <History className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Remover vínculo" onClick={() => setRemoveTarget(r)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {addOpen && (
        <AddProdutoDialog
          fornecedorId={fornecedorId}
          existingProdutoIds={rows.map((r) => r.produto.id)}
          ensureEmpresa={ensureEmpresa}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); load(); }}
        />
      )}

      {editTarget && (
        <EditPrecoDialog
          row={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load(); }}
        />
      )}

      {historyTarget && (
        <HistoryDialog
          row={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo</AlertDialogTitle>
            <AlertDialogDescription>
              Remover <strong>{removeTarget?.produto.descricao}</strong> da lista de produtos fornecidos?
              O histórico de preços será preservado e o vínculo pode ser recriado depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------- Adicionar Produto ----------

function AddProdutoDialog({
  fornecedorId,
  existingProdutoIds,
  ensureEmpresa,
  onClose,
  onSaved,
}: {
  fornecedorId: string;
  existingProdutoIds: string[];
  ensureEmpresa: () => Promise<string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [produtos, setProdutos] = useState<ProdutoLite[]>([]);
  const [selected, setSelected] = useState<ProdutoLite | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [novoForm, setNovoForm] = useState({
    codigo: "",
    descricao: "",
    categoria: "",
    unidade: "",
    fabricante: "",
  });
  const [preco, setPreco] = useState("");
  const [dataVigencia, setDataVigencia] = useState(today());
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("produtos")
        .select("id, codigo, descricao, unidade, categoria, fabricante")
        .is("deleted_at", null)
        .order("descricao");
      setProdutos((data ?? []) as ProdutoLite[]);
    })();
  }, []);

  const disponiveis = useMemo(
    () => produtos.filter((p) => !existingProdutoIds.includes(p.id)),
    [produtos, existingProdutoIds],
  );

  async function handleSave() {
    if (!creatingNew && !selected) return toast.error("Selecione um produto ou cadastre um novo");
    if (creatingNew) {
      if (!novoForm.codigo.trim()) return toast.error("Informe o código do produto");
      if (!novoForm.descricao.trim()) return toast.error("Informe a descrição");
    }
    const precoNum = Number(preco.replace(",", "."));
    if (!preco || Number.isNaN(precoNum) || precoNum < 0) return toast.error("Informe um preço válido");
    if (!dataVigencia) return toast.error("Informe a data de vigência");

    setSaving(true);
    try {
      const empresaId = await ensureEmpresa();
      let produtoId: string;

      if (creatingNew) {
        const codigoTrim = novoForm.codigo.trim().toUpperCase();
        // Checa duplicidade (mesma empresa)
        const { data: dup } = await supabase
          .from("produtos")
          .select("id")
          .eq("codigo", codigoTrim)
          .is("deleted_at", null)
          .maybeSingle();
        if (dup) throw new Error("Já existe um produto com este código nesta empresa");

        const { data: novo, error: eP } = await supabase
          .from("produtos")
          .insert({
            empresa_id: empresaId,
            codigo: codigoTrim,
            descricao: novoForm.descricao.trim(),
            categoria: novoForm.categoria || null,
            unidade: novoForm.unidade || null,
            fabricante: novoForm.fabricante || null,
          })
          .select("id")
          .single();
        if (eP || !novo) throw eP ?? new Error("Falha ao criar produto");
        produtoId = novo.id;
      } else {
        produtoId = selected!.id;
      }

      // Reativa vínculo soft-deleted, se houver
      const { data: existente } = await supabase
        .from("fornecedor_produtos")
        .select("id, deleted_at")
        .eq("fornecedor_id", fornecedorId)
        .eq("produto_id", produtoId)
        .maybeSingle();

      let fornecedorProdutoId: string;
      if (existente) {
        if (existente.deleted_at) {
          const { error } = await supabase
            .from("fornecedor_produtos")
            .update({ deleted_at: null })
            .eq("id", existente.id);
          if (error) throw error;
        }
        fornecedorProdutoId = existente.id;
      } else {
        const { data: link, error: eL } = await supabase
          .from("fornecedor_produtos")
          .insert({
            empresa_id: empresaId,
            fornecedor_id: fornecedorId,
            produto_id: produtoId,
          })
          .select("id")
          .single();
        if (eL || !link) throw eL ?? new Error("Falha ao vincular produto");
        fornecedorProdutoId = link.id;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error: ePr } = await supabase
        .from("fornecedor_produto_precos")
        .insert({
          fornecedor_produto_id: fornecedorProdutoId,
          preco: precoNum,
          data_vigencia: dataVigencia,
          observacoes: observacoes || null,
          created_by: user?.id ?? null,
        });
      if (ePr) throw ePr;

      toast.success("Produto adicionado ao fornecedor");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar produto ao fornecedor</DialogTitle>
          <DialogDescription>
            Selecione um produto existente ou cadastre um novo, e informe o preço inicial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!creatingNew ? (
            <>
              <div className="space-y-2">
                <Label>Produto</Label>
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selected ? `${selected.codigo} — ${selected.descricao}` : "Pesquisar produto..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar por código ou descrição..." />
                      <CommandList>
                        <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                        <CommandGroup>
                          {disponiveis.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.codigo} ${p.descricao}`}
                              onSelect={() => {
                                setSelected(p);
                                setComboOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selected?.id === p.id ? "opacity-100" : "opacity-0")} />
                              <span className="font-mono text-xs mr-2">{p.codigo}</span>
                              {p.descricao}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={() => { setCreatingNew(true); setSelected(null); }}>
                <PackagePlus className="h-4 w-4" /> Cadastrar novo produto
              </Button>
            </>
          ) : (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Novo produto</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreatingNew(false)}>
                  Cancelar
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Código *</Label>
                  <Input value={novoForm.codigo} onChange={(e) => setNovoForm({ ...novoForm, codigo: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Unidade</Label>
                  <Input value={novoForm.unidade} onChange={(e) => setNovoForm({ ...novoForm, unidade: e.target.value })} placeholder="UN, KG, M" />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Descrição *</Label>
                  <Input value={novoForm.descricao} onChange={(e) => setNovoForm({ ...novoForm, descricao: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Input value={novoForm.categoria} onChange={(e) => setNovoForm({ ...novoForm, categoria: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fabricante</Label>
                  <Input value={novoForm.fabricante} onChange={(e) => setNovoForm({ ...novoForm, fabricante: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Preço atual *</Label>
              <Input
                inputMode="decimal"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de vigência *</Label>
              <Input type="date" value={dataVigencia} onChange={(e) => setDataVigencia(e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Editar Preço (novo registro no histórico) ----------

function EditPrecoDialog({
  row,
  onClose,
  onSaved,
}: {
  row: LinhaProduto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [preco, setPreco] = useState(row.ultimo_preco !== null ? String(row.ultimo_preco).replace(".", ",") : "");
  const [dataVigencia, setDataVigencia] = useState(today());
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const precoNum = Number(preco.replace(",", "."));
    if (!preco || Number.isNaN(precoNum) || precoNum < 0) return toast.error("Informe um preço válido");
    if (!dataVigencia) return toast.error("Informe a data de vigência");

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("fornecedor_produto_precos").insert({
      fornecedor_produto_id: row.fornecedor_produto_id,
      preco: precoNum,
      data_vigencia: dataVigencia,
      observacoes: observacoes || null,
      created_by: user?.id ?? null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Novo preço registrado");
      onSaved();
    }
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar preço</DialogTitle>
          <DialogDescription>
            {row.produto.descricao} — um novo registro será criado no histórico.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Novo preço *</Label>
            <Input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label>Data de vigência *</Label>
            <Input type="date" value={dataVigencia} onChange={(e) => setDataVigencia(e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Histórico ----------

type PrecoRow = {
  id: string;
  preco: number;
  data_vigencia: string;
  observacoes: string | null;
  created_at: string;
};

function HistoryDialog({ row, onClose }: { row: LinhaProduto; onClose: () => void }) {
  const [items, setItems] = useState<PrecoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("fornecedor_produto_precos")
        .select("id, preco, data_vigencia, observacoes, created_at")
        .eq("fornecedor_produto_id", row.fornecedor_produto_id)
        .order("data_vigencia", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      else setItems((data ?? []).map((p) => ({ ...p, preco: Number(p.preco) })));
      setLoading(false);
    })();
  }, [row.fornecedor_produto_id]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de preços</DialogTitle>
          <DialogDescription>{row.produto.descricao}</DialogDescription>
        </DialogHeader>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vigência</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Registrado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Sem histórico.</TableCell></TableRow>
              ) : items.map((p, i) => (
                <TableRow key={p.id} className={i === 0 ? "bg-green-50/60 dark:bg-green-950/30" : ""}>
                  <TableCell>{new Date(p.data_vigencia + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right font-medium">{fmtBRL(p.preco)}</TableCell>
                  <TableCell className="text-sm">{p.observacoes || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
