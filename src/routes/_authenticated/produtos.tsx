import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, Search, Printer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CategoriaSelect } from "@/components/categoria-select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({ meta: [{ title: "Catálogo de Produtos | Mapa de Cotações" }] }),
  component: ProdutosPage,
});

type Produto = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  categoria: string | null;
  fabricante: string | null;
};

type Vinculo = {
  produto_id: string;
  preco: number | null;
  prazo_entrega: string | null;
  marca: string | null;
  codigo_fornecedor: string | null;
  data_ultima_atualizacao: string;
  fornecedor: { id: string; razao_social: string; nome_fantasia: string | null } | null;
};

type FornecedorFull = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email_comercial: string | null;
  email_financeiro: string | null;
  cidade: string | null;
  uf: string | null;
  observacoes: string | null;
};

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const nomeFornecedor = (f: { razao_social: string; nome_fantasia: string | null } | null) =>
  f ? (f.nome_fantasia || f.razao_social) : "—";

function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [empresaNome, setEmpresaNome] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [detail, setDetail] = useState<Produto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Produto | null>(null);

  // Sheet de fornecedores do produto (lazy)
  const [sheetProduto, setSheetProduto] = useState<Produto | null>(null);
  const [sheetVinculos, setSheetVinculos] = useState<Vinculo[] | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  // Dialog detalhe fornecedor (lazy)
  const [fornDetail, setFornDetail] = useState<FornecedorFull | null>(null);
  const [fornLoading, setFornLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: prods, error }, { data: links }, { data: emp }] = await Promise.all([
      supabase.from("produtos").select("id, codigo, descricao, unidade, categoria, fabricante").is("deleted_at", null),
      supabase
        .from("produto_fornecedor")
        .select("produto_id, preco, prazo_entrega, marca, codigo_fornecedor, data_ultima_atualizacao, fornecedor:fornecedores(id, razao_social, nome_fantasia)")
        .is("deleted_at", null)
        .eq("status", "ativo"),
      supabase.from("empresas").select("nome").limit(1).maybeSingle(),
    ]);
    if (error) toast.error("Erro ao carregar produtos");
    setProdutos((prods ?? []) as Produto[]);
    setVinculos(((links ?? []) as unknown as Vinculo[]).map((v) => ({
      ...v,
      preco: v.preco == null ? null : Number(v.preco),
    })));
    setEmpresaNome(emp?.nome ?? "");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const vincByProduto = useMemo(() => {
    const m = new Map<string, Vinculo[]>();
    for (const v of vinculos) {
      const arr = m.get(v.produto_id) ?? [];
      arr.push(v);
      m.set(v.produto_id, arr);
    }
    return m;
  }, [vinculos]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return produtos
      .filter((p) => !categoria || p.categoria === categoria)
      .filter((p) => !q || [p.codigo, p.descricao].filter(Boolean).some((v) => v!.toLowerCase().includes(q)))
      .sort((a, b) => {
        const ca = (a.categoria || "zzz").localeCompare(b.categoria || "zzz");
        if (ca !== 0) return ca;
        return a.descricao.localeCompare(b.descricao);
      });
  }, [produtos, search, categoria]);

  function menorPreco(produtoId: string): number | null {
    const arr = vincByProduto.get(produtoId) ?? [];
    const precos = arr.map((v) => v.preco).filter((p): p is number => p !== null);
    if (!precos.length) return null;
    return Math.min(...precos);
  }

  function fornecedoresDoProduto(produtoId: string) {
    return (vincByProduto.get(produtoId) ?? []).map((v) => nomeFornecedor(v.fornecedor));
  }

  async function openSheet(p: Produto) {
    setSheetProduto(p);
    setSheetVinculos(null);
    setSheetLoading(true);
    const { data, error } = await supabase
      .from("produto_fornecedor")
      .select("produto_id, preco, prazo_entrega, marca, codigo_fornecedor, data_ultima_atualizacao, fornecedor:fornecedores(id, razao_social, nome_fantasia)")
      .eq("produto_id", p.id)
      .is("deleted_at", null);
    if (error) toast.error("Erro ao carregar fornecedores");
    setSheetVinculos(((data ?? []) as unknown as Vinculo[]).map((v) => ({
      ...v,
      preco: v.preco == null ? null : Number(v.preco),
    })));
    setSheetLoading(false);
  }

  async function openFornecedor(fornecedorId: string) {
    setFornLoading(true);
    setFornDetail(null);
    const { data, error } = await supabase
      .from("fornecedores")
      .select("id, razao_social, nome_fantasia, cnpj, telefone, whatsapp, email_comercial, email_financeiro, cidade, uf, observacoes")
      .eq("id", fornecedorId)
      .maybeSingle();
    if (error) toast.error("Erro ao carregar fornecedor");
    else if (data) setFornDetail(data as FornecedorFull);
    setFornLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("produtos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteTarget.id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Produto excluído");
      load();
    }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6 print:space-y-2">
      <style>{`
        @media print {
          body { background: white; }
          [data-sidebar], nav, header, .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-hide { display: none !important; }
          main { padding: 0 !important; }
          table { font-size: 11px; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="print-only print:mb-4">
        <div className="text-sm text-muted-foreground">{empresaNome || "Empresa"}</div>
        <h1 className="text-xl font-bold">Catálogo de Produtos</h1>
        <div className="text-xs text-muted-foreground">
          Impresso em {new Date().toLocaleString("pt-BR")}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 print-hide">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Catálogo de Produtos</h1>
            <p className="text-sm text-muted-foreground">
              Consulta rápida ao catálogo. Cadastro é feito na aba de Fornecedores.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir lista
        </Button>
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="gap-2 print-hide">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Lista de produtos</CardTitle>
              <CardDescription>
                {produtos.length} {produtos.length === 1 ? "produto" : "produtos"} no catálogo.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="w-full max-w-xs">
                <CategoriaSelect
                  value={categoria}
                  onChange={setCategoria}
                  includeAllOption
                  allOptionLabel="Todas as categorias"
                  placeholder="Filtrar por categoria"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="print:p-0">
          <div className="rounded-md border print:border-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="print-hide">Fornecedores</TableHead>
                  <TableHead className="text-right print-hide">Menor preço</TableHead>
                  <TableHead className="w-[60px] text-right print-hide">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {produtos.length === 0 ? "Nenhum produto cadastrado ainda." : "Nenhum resultado para a busca."}
                  </TableCell></TableRow>
                ) : filtered.map((p) => {
                  const forns = fornecedoresDoProduto(p.id);
                  const mp = menorPreco(p.id);
                  return (
                    <TableRow key={p.id} className="cursor-pointer print:cursor-auto" onClick={() => setDetail(p)}>
                      <TableCell className="font-mono text-xs font-medium">{p.codigo}</TableCell>
                      <TableCell>{p.descricao}</TableCell>
                      <TableCell>{p.unidade || "—"}</TableCell>
                      <TableCell>{p.categoria || "—"}</TableCell>
                      <TableCell
                        className="print-hide"
                        onClick={(e) => { e.stopPropagation(); openSheet(p); }}
                      >
                        {forns.length === 0 ? (
                          <span className="text-muted-foreground text-xs hover:underline">Nenhum</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 hover:opacity-80">
                            {forns.slice(0, 3).map((n, i) => (
                              <Badge key={i} variant="secondary" className="text-xs font-normal cursor-pointer">{n}</Badge>
                            ))}
                            {forns.length > 3 && (
                              <Badge variant="outline" className="text-xs cursor-pointer">+{forns.length - 3}</Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium print-hide">
                        {mp !== null ? fmtBRL(mp) : "—"}
                      </TableCell>
                      <TableCell className="text-right print-hide">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                          aria-label="Excluir produto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.descricao}</DialogTitle>
            <DialogDescription>
              <span className="font-mono">{detail?.codigo}</span>
              {detail?.categoria ? ` · ${detail.categoria}` : ""}
              {detail?.unidade ? ` · ${detail.unidade}` : ""}
              {detail?.fabricante ? ` · ${detail.fabricante}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Cód. fornecedor</TableHead>
                    <TableHead>Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(vincByProduto.get(detail.id) ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      Nenhum fornecedor vinculado a este produto.
                    </TableCell></TableRow>
                  ) : (vincByProduto.get(detail.id) ?? [])
                      .slice()
                      .sort((a, b) => (a.preco ?? Infinity) - (b.preco ?? Infinity))
                      .map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{nomeFornecedor(v.fornecedor)}</TableCell>
                      <TableCell className="text-right">{v.preco !== null ? fmtBRL(v.preco) : "—"}</TableCell>
                      <TableCell>{v.prazo_entrega || "—"}</TableCell>
                      <TableCell>{v.marca || "—"}</TableCell>
                      <TableCell>{v.codigo_fornecedor || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(v.data_ultima_atualizacao).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sheet de fornecedores do produto */}
      <Sheet open={!!sheetProduto} onOpenChange={(o) => { if (!o) { setSheetProduto(null); setSheetVinculos(null); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Fornecedores de {sheetProduto?.descricao}</SheetTitle>
            <SheetDescription>Clique em um fornecedor para ver os dados completos.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {sheetLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
            ) : (sheetVinculos ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum fornecedor vinculado.</p>
            ) : (sheetVinculos ?? [])
                .slice()
                .sort((a, b) => (a.preco ?? Infinity) - (b.preco ?? Infinity))
                .map((v, i) => (
              <button
                key={i}
                type="button"
                onClick={() => v.fornecedor && openFornecedor(v.fornecedor.id)}
                className="w-full text-left rounded-md border p-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{nomeFornecedor(v.fornecedor)}</div>
                  <div className="font-semibold whitespace-nowrap">
                    {v.preco !== null ? fmtBRL(v.preco) : "—"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-x-2">
                  {v.prazo_entrega && <span>Prazo: {v.prazo_entrega}</span>}
                  {v.marca && <span>· Marca: {v.marca}</span>}
                  {v.codigo_fornecedor && <span>· Cód.: {v.codigo_fornecedor}</span>}
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog detalhe do fornecedor */}
      <Dialog open={!!fornDetail || fornLoading} onOpenChange={(o) => { if (!o) { setFornDetail(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{fornDetail?.nome_fantasia || fornDetail?.razao_social || "Fornecedor"}</DialogTitle>
            <DialogDescription>Dados do fornecedor (somente leitura).</DialogDescription>
          </DialogHeader>
          {fornLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : fornDetail ? (
            <div className="space-y-2 text-sm">
              <Row label="Razão social" value={fornDetail.razao_social} />
              <Row label="Nome fantasia" value={fornDetail.nome_fantasia} />
              <Row label="CNPJ" value={fornDetail.cnpj} />
              <Row label="Telefone" value={fornDetail.telefone} />
              <Row label="WhatsApp" value={fornDetail.whatsapp} />
              <Row label="E-mail comercial" value={fornDetail.email_comercial} />
              <Row label="E-mail financeiro" value={fornDetail.email_financeiro} />
              <Row
                label="Cidade/UF"
                value={[fornDetail.cidade, fornDetail.uf].filter(Boolean).join("/") || null}
              />
              <Row label="Observações" value={fornDetail.observacoes} />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFornDetail(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto "{deleteTarget?.descricao}" será removido do catálogo. Esta ação não pode ser desfeita pela interface.
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

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 border-b py-1.5 last:border-0">
      <div className="text-muted-foreground">{label}</div>
      <div>{value || "—"}</div>
    </div>
  );
}
