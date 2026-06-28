import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico | Mapa de Cotações" }] }),
  component: HistoricoPage,
});

type Fornecedor = { id: string; razao_social: string; nome_fantasia: string | null };

type HistoricoRow = {
  id: string;
  codigo: string;
  created_at: string;
  obra: string;
  fornecedores: Fornecedor[];
  vencedor: { fornecedor: Fornecedor; total: number } | null;
};

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function HistoricoPage() {
  const [rows, setRows] = useState<HistoricoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: mapas, error } = await supabase
      .from("mapas_cotacao")
      .select("id, codigo, created_at, solicitacao:solicitacoes(obra:obras(nome))")
      .eq("status", "finalizado")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const ids = (mapas ?? []).map((m) => m.id);
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: itens } = await supabase
      .from("mapa_itens")
      .select("id, mapa_id, quantidade")
      .in("mapa_id", ids);

    const itemIds = (itens ?? []).map((i) => i.id);
    const { data: precos } = itemIds.length
      ? await supabase
          .from("mapa_precos")
          .select("mapa_item_id, fornecedor_id, preco, fornecedor:fornecedores(id, razao_social, nome_fantasia)")
          .in("mapa_item_id", itemIds)
      : { data: [] as any[] };

    const itemToMapa = new Map<string, { mapa_id: string; quantidade: number }>();
    (itens ?? []).forEach((i) => itemToMapa.set(i.id, { mapa_id: i.mapa_id, quantidade: Number(i.quantidade) }));

    // Build per-mapa: fornecedores set + totals
    const perMapa = new Map<string, { fornecedores: Map<string, Fornecedor>; totals: Map<string, number> }>();
    ids.forEach((id) => perMapa.set(id, { fornecedores: new Map(), totals: new Map() }));

    (precos ?? []).forEach((p: any) => {
      const link = itemToMapa.get(p.mapa_item_id);
      if (!link) return;
      const bucket = perMapa.get(link.mapa_id)!;
      if (p.fornecedor) bucket.fornecedores.set(p.fornecedor.id, p.fornecedor);
      if (p.preco !== null && p.preco !== undefined) {
        const cur = bucket.totals.get(p.fornecedor_id) ?? 0;
        bucket.totals.set(p.fornecedor_id, cur + Number(p.preco) * link.quantidade);
      }
    });

    const result: HistoricoRow[] = (mapas as any[]).map((m) => {
      const bucket = perMapa.get(m.id)!;
      const fornecedores = Array.from(bucket.fornecedores.values());
      let vencedor: HistoricoRow["vencedor"] = null;
      bucket.totals.forEach((total, fid) => {
        if (total <= 0) return;
        if (!vencedor || total < vencedor.total) {
          const f = bucket.fornecedores.get(fid);
          if (f) vencedor = { fornecedor: f, total };
        }
      });
      return {
        id: m.id,
        codigo: m.codigo,
        created_at: m.created_at,
        obra: m.solicitacao?.obra?.nome ?? "-",
        fornecedores,
        vencedor,
      };
    });
    setRows(result);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.codigo.toLowerCase().includes(s) ||
        r.obra.toLowerCase().includes(s) ||
        r.fornecedores.some((f) => (f.nome_fantasia || f.razao_social).toLowerCase().includes(s)),
    );
  }, [rows, search]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Histórico</h1>
        <p className="text-muted-foreground text-sm">Mapas de cotação finalizados.</p>
      </div>

      <Input
        placeholder="Buscar por código, obra ou fornecedor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Fornecedores</TableHead>
                <TableHead>Vencedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum mapa finalizado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.codigo}</TableCell>
                    <TableCell>{r.obra}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.fornecedores.map((f) => (
                          <Badge key={f.id} variant="outline">
                            {f.nome_fantasia || f.razao_social}
                          </Badge>
                        ))}
                        {r.fornecedores.length === 0 && "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.vencedor ? (
                        <Badge variant="default">
                          {r.vencedor.fornecedor.nome_fantasia || r.vencedor.fornecedor.razao_social}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {r.vencedor ? fmt(r.vencedor.total) : "-"}
                    </TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>
                        <Eye className="h-4 w-4 mr-1" /> Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {openId && <MapaViewDialog mapaId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

type ItemDetail = {
  id: string;
  quantidade: number;
  produto: { codigo: string; descricao: string; unidade: string | null };
  precos: Record<string, number | null>;
};

function MapaViewDialog({ mapaId, onClose }: { mapaId: string; onClose: () => void }) {
  const [mapa, setMapa] = useState<{ codigo: string; status: string } | null>(null);
  const [items, setItems] = useState<ItemDetail[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from("mapas_cotacao")
        .select("codigo, status")
        .eq("id", mapaId)
        .single();
      setMapa(m);

      const { data: itensData } = await supabase
        .from("mapa_itens")
        .select("id, quantidade, produto:produtos(codigo, descricao, unidade)")
        .eq("mapa_id", mapaId);

      const itemIds = (itensData ?? []).map((i: any) => i.id);
      const { data: precosData } = itemIds.length
        ? await supabase
            .from("mapa_precos")
            .select("mapa_item_id, fornecedor_id, preco, fornecedor:fornecedores(id, razao_social, nome_fantasia)")
            .in("mapa_item_id", itemIds)
        : { data: [] as any[] };

      const fornMap = new Map<string, Fornecedor>();
      (precosData ?? []).forEach((p: any) => {
        if (p.fornecedor) fornMap.set(p.fornecedor.id, p.fornecedor);
      });
      setFornecedores(Array.from(fornMap.values()));

      setItems(
        (itensData ?? []).map((it: any) => {
          const precos: Record<string, number | null> = {};
          (precosData ?? [])
            .filter((p: any) => p.mapa_item_id === it.id)
            .forEach((p: any) => {
              precos[p.fornecedor_id] = p.preco === null ? null : Number(p.preco);
            });
          return {
            id: it.id,
            quantidade: Number(it.quantidade),
            produto: it.produto,
            precos,
          };
        }),
      );
      setLoading(false);
    })();
  }, [mapaId]);

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

  const ranking = useMemo(
    () =>
      [...fornecedores]
        .map((f) => ({ f, total: totals[f.id] }))
        .filter((r) => r.total > 0)
        .sort((a, b) => a.total - b.total),
    [fornecedores, totals],
  );

  function minForItem(it: ItemDetail): number | null {
    const vals = fornecedores
      .map((f) => it.precos[f.id])
      .filter((v): v is number => v !== null && v !== undefined && v > 0);
    return vals.length ? Math.min(...vals) : null;
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Mapa {mapa?.codigo}{" "}
            <Badge className="ml-2" variant="secondary">
              {mapa?.status}
            </Badge>
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
                  {items.map((it) => {
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
                            <TableCell
                              key={f.id}
                              className={`text-right ${isMin ? "bg-green-50 dark:bg-green-950 font-medium" : ""}`}
                            >
                              {p !== null && p !== undefined ? fmt(p) : "-"}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
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
