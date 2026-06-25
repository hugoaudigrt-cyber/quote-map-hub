import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | Mapa de Cotações" }] }),
  component: Dashboard,
});

type Perfil = {
  nome: string;
  email: string;
  cargo: string | null;
  empresas: { nome: string; plano: string } | null;
};

function Dashboard() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("nome, email, cargo, empresas(nome, plano)")
        .maybeSingle();
      if (error) toast.error(error.message);
      setPerfil(data as Perfil | null);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta{perfil?.nome ? `, ${perfil.nome}` : ""}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Empresa
            </CardTitle>
            <CardDescription>Dados da sua organização</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Nome:</span> {perfil?.empresas?.nome ?? "—"}</p>
                <p><span className="text-muted-foreground">Plano:</span> {perfil?.empresas?.plano ?? "—"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> Perfil
            </CardTitle>
            <CardDescription>Suas informações</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Nome:</span> {perfil?.nome ?? "—"}</p>
                <p><span className="text-muted-foreground">Email:</span> {perfil?.email ?? "—"}</p>
                <p><span className="text-muted-foreground">Cargo:</span> {perfil?.cargo ?? "—"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas cotações</CardTitle>
          <CardDescription>Em breve você poderá criar e acompanhar cotações por aqui.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground border border-dashed rounded-lg">
            Nenhuma cotação ainda.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
