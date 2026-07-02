import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Check, ChevronsUpDown, PackagePlus } from "lucide-react";
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
import { CategoriaSelect } from "@/components/categoria-select";

type ProdutoLite = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  categoria: string | null;
  fabricante: string | null;
};

type Linha = {
  id: string;
  produto: ProdutoLite;
  preco: number | null;
  prazo_entrega: string | null;
  marca: string | null;
  codigo_fornecedor: string | null;
  observacoes: string | null;
  data_ultima_atualizacao: string;
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FornecedorProdutosTab({ fornecedorId }: { fornecedorId: string }) {
  const ensureEmpresa = useEnsureEmpresa();
  const [rows, setRows] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Linha | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Linha | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("produto_fornecedor")
      .select("id, preco, prazo_entrega, marca, codigo_fornecedor, observacoes, data_ultima_atualizacao, produto:produtos(id, codigo, descricao, unidade, categoria, fabricante)")
      .eq("fornecedor_id", fornecedorId)
      .is("deleted_at", null);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const result: Linha[] = (data ?? [])
      .filter((l) => l.produto)
      .map((l) => ({
        id: l.id,
        produto: l.produto as unknown as ProdutoLite,
        preco: l.preco == null ? null : Number(l.preco),
        prazo_entrega: l.prazo_entrega,
        marca: l.marca,
        codigo_fornecedor: l.codigo_fornecedor,
        observacoes: l.observacoes,
        data_ultima_atualizacao: l.data_ultima_atualizacao,
      }))
      .sort((a, b) => a.produto.descricao.localeCompare(b.produto.descricao));
    setRows(result);
    setLoading(false);
  }, [fornecedorId]);

  useEffect(() => { load(); }, [load]);

  async function handleRemove() {
    if (!removeTarget) return;
    const { error } = await supabase
      .from("produto_fornecedor")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", removeTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Vínculo removido"); load(); }
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
              <TableHead className="text-right">Preço</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                Nenhum produto vinculado. Clique em "Adicionar produto".
              </TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.produto.descricao}</div>
                  <div className="text-xs text-muted-foreground font-mono">{r.produto.codigo}</div>
                </TableCell>
                <TableCell>{r.produto.categoria || "—"}</TableCell>
                <TableCell>{r.produto.unidade || "—"}</TableCell>
                <TableCell className="text-right font-medium">
                  {r.preco !== null ? fmtBRL(r.preco) : "—"}
                </TableCell>
                <TableCell>{r.prazo_entrega || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(r.data_ultima_atualizacao).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditTarget(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Remover" onClick={() => setRemoveTarget(r)}>
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
        <EditVinculoDialog
          row={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load(); }}
        />
      )}

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo</AlertDialogTitle>
            <AlertDialogDescription>
              Remover <strong>{removeTarget?.produto.descricao}</strong> da lista de produtos fornecidos?
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
    descricao: "",
    categoria: "",
    unidade: "",
    fabricante: "",
  });
  const [preco, setPreco] = useState("");
  const [prazo, setPrazo] = useState("");
  const [marca, setMarca] = useState("");
  const [codigoFornecedor, setCodigoFornecedor] = useState("");
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
    if (creatingNew && !novoForm.descricao.trim()) return toast.error("Informe a descrição");

    const precoNum = preco === "" ? null : Number(preco.replace(",", "."));
    if (precoNum !== null && (Number.isNaN(precoNum) || precoNum < 0)) return toast.error("Preço inválido");

    setSaving(true);
    try {
      const empresaId = await ensureEmpresa();
      let produtoId: string;

      if (creatingNew) {
        const { data: novo, error: eP } = await supabase
          .from("produtos")
          .insert({
            empresa_id: empresaId,
            codigo: "",
            descricao: novoForm.descricao.trim(),
            categoria: novoForm.categoria || null,
            unidade: novoForm.unidade || null,
            fabricante: novoForm.fabricante || null,
          } as never)
          .select("id")
          .single();
        if (eP || !novo) throw eP ?? new Error("Falha ao criar produto");
        produtoId = novo.id;
      } else {
        produtoId = selected!.id;
      }

      // Reativa vínculo soft-deleted, se houver
      const { data: existente } = await supabase
        .from("produto_fornecedor")
        .select("id, deleted_at")
        .eq("fornecedor_id", fornecedorId)
        .eq("produto_id", produtoId)
        .maybeSingle();

      const payload = {
        preco: precoNum,
        prazo_entrega: prazo || null,
        marca: marca || null,
        codigo_fornecedor: codigoFornecedor || null,
        observacoes: observacoes || null,
        data_ultima_atualizacao: new Date().toISOString(),
        status: "ativo",
      };

      if (existente) {
        const { error } = await supabase
          .from("produto_fornecedor")
          .update({ ...payload, deleted_at: null })
          .eq("id", existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("produto_fornecedor")
          .insert({
            ...payload,
            empresa_id: empresaId,
            fornecedor_id: fornecedorId,
            produto_id: produtoId,
          });
        if (error) throw error;
      }

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
            Selecione um produto existente ou cadastre um novo, e informe as condições comerciais.
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
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Descrição *</Label>
                  <Input value={novoForm.descricao} onChange={(e) => setNovoForm({ ...novoForm, descricao: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Unidade</Label>
                  <Input value={novoForm.unidade} onChange={(e) => setNovoForm({ ...novoForm, unidade: e.target.value })} placeholder="UN, KG, M" />
                </div>
                <div className="space-y-1.5">
                  <Label>Fabricante</Label>
                  <Input value={novoForm.fabricante} onChange={(e) => setNovoForm({ ...novoForm, fabricante: e.target.value })} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Categoria</Label>
                  <CategoriaSelect
                    value={novoForm.categoria}
                    onChange={(v) => setNovoForm({ ...novoForm, categoria: v })}
                    allowCreate
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                O código do produto será gerado automaticamente (PRD-XXXXX).
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Preço</Label>
              <Input
                inputMode="decimal"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo de entrega</Label>
              <Input value={prazo} onChange={(e) => setPrazo(e.target.value)} placeholder="Ex: 5 dias úteis" />
            </div>
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input value={marca} onChange={(e) => setMarca(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Código no fornecedor</Label>
              <Input value={codigoFornecedor} onChange={(e) => setCodigoFornecedor(e.target.value)} />
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

// ---------- Editar Vínculo ----------

function EditVinculoDialog({
  row,
  onClose,
  onSaved,
}: {
  row: Linha;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [preco, setPreco] = useState(row.preco !== null ? String(row.preco).replace(".", ",") : "");
  const [prazo, setPrazo] = useState(row.prazo_entrega ?? "");
  const [marca, setMarca] = useState(row.marca ?? "");
  const [codigoFornecedor, setCodigoFornecedor] = useState(row.codigo_fornecedor ?? "");
  const [observacoes, setObservacoes] = useState(row.observacoes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const precoNum = preco === "" ? null : Number(preco.replace(",", "."));
    if (precoNum !== null && (Number.isNaN(precoNum) || precoNum < 0)) return toast.error("Preço inválido");

    setSaving(true);
    const { error } = await supabase.from("produto_fornecedor").update({
      preco: precoNum,
      prazo_entrega: prazo || null,
      marca: marca || null,
      codigo_fornecedor: codigoFornecedor || null,
      observacoes: observacoes || null,
      data_ultima_atualizacao: new Date().toISOString(),
    }).eq("id", row.id);
    if (error) toast.error(error.message);
    else { toast.success("Vínculo atualizado"); onSaved(); }
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar vínculo</DialogTitle>
          <DialogDescription>{row.produto.descricao}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Preço</Label>
            <Input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label>Prazo de entrega</Label>
            <Input value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Marca</Label>
            <Input value={marca} onChange={(e) => setMarca(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Código no fornecedor</Label>
            <Input value={codigoFornecedor} onChange={(e) => setCodigoFornecedor(e.target.value)} />
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
