import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEnsureEmpresa } from "@/hooks/use-empresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/mapas")({
  head: () => ({ meta: [{ title: "Mapas de Cotação | Mapa de Cotações" }] }),
  component: MapasPage,
});

type MapaRow = {
  id: string;
  codigo: string;
  status: string;
  created_at: string;
  solicitacao: { codigo: string; obra: { nome: string } | null } | null;
};

type Solicitacao = { id: string; codigo: string; obra: { nome: string } | null };
type Fornecedor = { id: string; razao_social: string; nome_fantasia: string | null };
type Produto = { id: string; codigo: string; descricao: string; unidade: string | null };

type ItemRow = {
  id: string;
  produto_id: string;
  quantidade: number;
  produto: Produto;
  precos: Record<string, number | null>; // fornecedor_id -> preco
  precoIds: Record<string, string>; // fornecedor_id -> preco row id
};

function MapasPage() {
  const [mapas, setMapas] = useState<MapaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedMapaId, setSelectedMapaId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("mapas_cotacao")
      .select("id, codigo, status, created_at, solicitacao:solicitacoes(codigo, obra:obras(nome))")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setMapas((data as unknown as MapaRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapas de Cotação</h1>
          <p className="text-muted-foreground text-sm">
            Compare preços entre fornecedores para suas solicitações.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Mapa
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Solicitação</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : mapas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum mapa de cotação cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                mapas.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.codigo}</TableCell>
                    <TableCell>{m.solicitacao?.codigo ?? "-"}</TableCell>
                    <TableCell>{m.solicitacao?.obra?.nome ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={m.status === "finalizado" ? "default" : m.status === "cancelado" ? "destructive" : "secondary"}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(m.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMapaId(m.id);
                          setEditOpen(true);
                        }}
                      >
                        Abrir
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(m.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {newOpen && (
        <NovoMapaDialog
          onClose={() => setNewOpen(false)}
          onCreated={(id) => {
            setNewOpen(false);
            load();
            setSelectedMapaId(id);
            setEditOpen(true);
          }}
        />
      )}

      {editOpen && selectedMapaId && (
        <MapaDetailDialog
          mapaId={selectedMapaId}
          onClose={() => {
            setEditOpen(false);
            setSelectedMapaId(null);
            load();
          }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mapa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                const { error } = await supabase.from("mapas_cotacao").update({ deleted_at: new Date().toISOString() }).eq("id", deleteId);
                if (error) toast.error(error.message);
                else {
                  toast.success("Mapa excluído");
                  load();
                }
                setDeleteId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NovoMapaDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const ensureEmpresa = useEnsureEmpresa();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [solicitacaoId, setSolicitacaoId] = useState<string>("");
  const [fornecedorIds, setFornecedorIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, f] = await Promise.all([
        supabase
          .from("solicitacoes")
          .select("id, codigo, obra:obras(nome)")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("fornecedores").select("id, razao_social, nome_fantasia").is("deleted_at", null).order("razao_social"),
      ]);
      if (s.error) toast.error(s.error.message);
      else setSolicitacoes((s.data as unknown as Solicitacao[]) ?? []);
      if (f.error) toast.error(f.error.message);
      else setFornecedores((f.data as Fornecedor[]) ?? []);
    })();
  }, []);

  function toggleFornecedor(id: string) {
    setFornecedorIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) {
        toast.error("Máximo de 5 fornecedores");
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleCreate() {
    if (!solicitacaoId) return toast.error("Selecione uma solicitação");
    if (fornecedorIds.length === 0) return toast.error("Selecione ao menos um fornecedor");

    setSaving(true);
    try {
      const empresaId = await ensureEmpresa();

      // create mapa
      const { data: mapa, error: e1 } = await supabase
        .from("mapas_cotacao")
        .insert({ empresa_id: empresaId, solicitacao_id: solicitacaoId, codigo: "" })
        .select("id")
        .single();
      if (e1) throw e1;

      // copy itens from solicitacao
      const { data: itens, error: e2 } = await supabase
        .from("solicitacao_itens")
        .select("produto_id, quantidade")
        .eq("solicitacao_id", solicitacaoId);
      if (e2) throw e2;

      if (itens && itens.length > 0) {
        const { data: insertedItens, error: e3 } = await supabase
          .from("mapa_itens")
          .insert(itens.map((i) => ({ mapa_id: mapa.id, produto_id: i.produto_id, quantidade: i.quantidade })))
          .select("id, produto_id");
        if (e3) throw e3;

        // Pré-carrega último preço vigente por (fornecedor, produto)
        const produtoIds = Array.from(new Set(itens.map((i) => i.produto_id)));
        const { data: links } = await supabase
          .from("fornecedor_produtos")
          .select("id, fornecedor_id, produto_id")
          .in("fornecedor_id", fornecedorIds)
          .in("produto_id", produtoIds)
          .is("deleted_at", null);

        const linkByPair = new Map<string, string>(); // `${forn}|${prod}` -> link.id
        const linkIds: string[] = [];
        (links ?? []).forEach((l) => {
          linkByPair.set(`${l.fornecedor_id}|${l.produto_id}`, l.id);
          linkIds.push(l.id);
        });

        const ultimoPorLink = new Map<string, number>();
        if (linkIds.length) {
          const { data: precosHist } = await supabase
            .from("fornecedor_produto_precos")
            .select("fornecedor_produto_id, preco, data_vigencia, created_at")
            .in("fornecedor_produto_id", linkIds)
            .order("data_vigencia", { ascending: false })
            .order("created_at", { ascending: false });
          (precosHist ?? []).forEach((p) => {
            if (!ultimoPorLink.has(p.fornecedor_produto_id)) {
              ultimoPorLink.set(p.fornecedor_produto_id, Number(p.preco));
            }
          });
        }

        const precos = insertedItens!.flatMap((it) =>
          fornecedorIds.map((fid) => {
            const linkId = linkByPair.get(`${fid}|${it.produto_id}`);
            const preco = linkId ? ultimoPorLink.get(linkId) ?? null : null;
            return { mapa_item_id: it.id, fornecedor_id: fid, preco };
          }),
        );
        if (precos.length > 0) {
          const { error: e4 } = await supabase.from("mapa_precos").insert(precos);
          if (e4) throw e4;
        }
      }


      toast.success("Mapa criado");
      onCreated(mapa.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar mapa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo Mapa de Cotação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Solicitação de Compra</Label>
            <Select value={solicitacaoId} onValueChange={setSolicitacaoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma solicitação" />
              </SelectTrigger>
              <SelectContent>
                {solicitacoes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.codigo} {s.obra ? `— ${s.obra.nome}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fornecedores (até 5) — {fornecedorIds.length} selecionados</Label>
            <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-1">
              {fornecedores.map((f) => (
                <label key={f.id} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer">
                  <Checkbox
                    checked={fornecedorIds.includes(f.id)}
                    onCheckedChange={() => toggleFornecedor(f.id)}
                  />
                  <span className="text-sm">{f.nome_fantasia || f.razao_social}</span>
                </label>
              ))}
              {fornecedores.length === 0 && (
                <p className="text-sm text-muted-foreground p-2">Nenhum fornecedor cadastrado.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Criando..." : "Criar Mapa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MapaDetailDialog({ mapaId, onClose }: { mapaId: string; onClose: () => void }) {
  const [mapa, setMapa] = useState<{ codigo: string; status: string } | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: m, error: em } = await supabase
      .from("mapas_cotacao")
      .select("codigo, status")
      .eq("id", mapaId)
      .single();
    if (em) toast.error(em.message);
    else setMapa(m);

    const { data: itensData, error: ei } = await supabase
      .from("mapa_itens")
      .select("id, produto_id, quantidade, produto:produtos(id, codigo, descricao, unidade)")
      .eq("mapa_id", mapaId);
    if (ei) {
      toast.error(ei.message);
      setLoading(false);
      return;
    }

    const itemIds = (itensData ?? []).map((i) => i.id);
    const { data: precosData } = itemIds.length
      ? await supabase
          .from("mapa_precos")
          .select("id, mapa_item_id, fornecedor_id, preco, fornecedor:fornecedores(id, razao_social, nome_fantasia)")
          .in("mapa_item_id", itemIds)
      : { data: [] as any[] };

    const fornMap = new Map<string, Fornecedor>();
    (precosData ?? []).forEach((p: any) => {
      if (p.fornecedor) fornMap.set(p.fornecedor.id, p.fornecedor);
    });
    setFornecedores(Array.from(fornMap.values()));

    const rows: ItemRow[] = (itensData ?? []).map((it: any) => {
      const precos: Record<string, number | null> = {};
      const precoIds: Record<string, string> = {};
      (precosData ?? [])
        .filter((p: any) => p.mapa_item_id === it.id)
        .forEach((p: any) => {
          precos[p.fornecedor_id] = p.preco === null ? null : Number(p.preco);
          precoIds[p.fornecedor_id] = p.id;
        });
      return {
        id: it.id,
        produto_id: it.produto_id,
        quantidade: Number(it.quantidade),
        produto: it.produto,
        precos,
        precoIds,
      };
    });
    setItems(rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapaId]);

  async function updatePreco(itemIdx: number, fornecedorId: string, value: string) {
    const num = value === "" ? null : Number(value);
    if (num !== null && Number.isNaN(num)) return;
    const item = items[itemIdx];
    const precoId = item.precoIds[fornecedorId];
    setItems((prev) => {
      const next = [...prev];
      next[itemIdx] = { ...next[itemIdx], precos: { ...next[itemIdx].precos, [fornecedorId]: num } };
      return next;
    });
    const { error } = await supabase.from("mapa_precos").update({ preco: num }).eq("id", precoId);
    if (error) toast.error(error.message);
  }

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    fornecedores.forEach((f) => (t[f.id] = 0));
    items.forEach((it) => {
      fornecedores.forEach((f) => {
        const p = it.precos[f.id];
        if (p !== null && p !== undefined) t[f.id] += p * it.quantidade;
      });
    });
    return t;
  }, [items, fornecedores]);

  const ranking = useMemo(() => {
    return [...fornecedores]
      .map((f) => ({ f, total: totals[f.id] }))
      .filter((r) => r.total > 0)
      .sort((a, b) => a.total - b.total);
  }, [fornecedores, totals]);

  function minForItem(it: ItemRow): number | null {
    const vals = fornecedores
      .map((f) => it.precos[f.id])
      .filter((v): v is number => v !== null && v !== undefined && v > 0);
    return vals.length ? Math.min(...vals) : null;
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Mapa {mapa?.codigo} <Badge className="ml-2" variant="secondary">{mapa?.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-6">
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Un.</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    {fornecedores.map((f) => (
                      <TableHead key={f.id} className="text-right min-w-[140px]">
                        {f.nome_fantasia || f.razao_social}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => {
                    const min = minForItem(it);
                    return (
                      <TableRow key={it.id}>
                        <TableCell>
                          <div className="font-medium">{it.produto.descricao}</div>
                          <div className="text-xs text-muted-foreground">{it.produto.codigo}</div>
                        </TableCell>
                        <TableCell>{it.produto.unidade ?? "-"}</TableCell>
                        <TableCell className="text-right">{it.quantidade}</TableCell>
                        {fornecedores.map((f) => {
                          const p = it.precos[f.id];
                          const isMin = min !== null && p === min;
                          return (
                            <TableCell key={f.id} className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                value={p ?? ""}
                                onChange={(e) => updatePreco(idx, f.id, e.target.value)}
                                className={`text-right h-8 ${isMin ? "bg-green-50 border-green-500 dark:bg-green-950" : ""}`}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3 + fornecedores.length} className="text-center text-muted-foreground">
                        Nenhum item.
                      </TableCell>
                    </TableRow>
                  )}
                  {items.length > 0 && (
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell colSpan={3} className="text-right">
                        Total
                      </TableCell>
                      {fornecedores.map((f) => {
                        const best = ranking[0]?.f.id === f.id;
                        return (
                          <TableCell key={f.id} className={`text-right ${best ? "text-green-600" : ""}`}>
                            {fmt(totals[f.id] ?? 0)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {ranking.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> Ranking de Melhor Preço
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {ranking.map((r, i) => (
                      <li key={r.f.id} className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Badge variant={i === 0 ? "default" : "outline"}>{i + 1}º</Badge>
                          {r.f.nome_fantasia || r.f.razao_social}
                        </span>
                        <span className="font-medium">{fmt(r.total)}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
