import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useEnsureEmpresa } from "@/hooks/use-empresa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresa")({
  head: () => ({ meta: [{ title: "Empresa | Mapa de Cotações" }] }),
  component: EmpresaPage,
});

type Empresa = Tables<"empresas">;

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const formatCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

function EmpresaPage() {
  const ensureEmpresa = useEnsureEmpresa();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [form, setForm] = useState({ nome: "", cnpj: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const empresaId = await ensureEmpresa();
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", empresaId)
        .single();

      if (error) throw error;
      setEmpresa(data);
      setForm({ nome: data.nome ?? "", cnpj: data.cnpj ?? "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar empresa");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!empresa) return;
    if (!form.nome.trim()) return toast.error("Informe o nome da empresa");

    const cnpj = onlyDigits(form.cnpj);
    if (cnpj && cnpj.length !== 14) return toast.error("CNPJ deve ter 14 dígitos");

    setSaving(true);
    const { error } = await supabase
      .from("empresas")
      .update({ nome: form.nome.trim(), cnpj: cnpj || null })
      .eq("id", empresa.id);

    if (error) toast.error("Erro ao atualizar empresa: " + error.message);
    else { toast.success("Empresa atualizada"); load(); }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Empresa</h1>
          <p className="text-sm text-muted-foreground">Dados cadastrais da sua organização.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadastro da empresa</CardTitle>
          <CardDescription>Atualize as informações usadas nos processos de compra.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" value={formatCnpj(form.cnpj)} onChange={(e) => setForm({ ...form, cnpj: onlyDigits(e.target.value) })} maxLength={18} />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Input value={empresa?.plano ?? "free"} disabled />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
