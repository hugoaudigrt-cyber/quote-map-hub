import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mapa de Cotações — Gestão de cotações multiempresa" },
      { name: "description", content: "Plataforma SaaS para gerenciar cotações entre múltiplas empresas com segurança e simplicidade." },
      { property: "og:title", content: "Mapa de Cotações" },
      { property: "og:description", content: "Plataforma SaaS para gerenciar cotações entre múltiplas empresas." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-semibold">Mapa de Cotações</span>
          </div>
          <Link to="/auth">
            <Button size="sm">Entrar</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
            Centralize cotações da sua empresa em um só lugar
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Plataforma multiempresa para organizar, comparar e acompanhar cotações com segurança.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth"><Button size="lg">Começar grátis</Button></Link>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24 grid gap-6 md:grid-cols-2 max-w-4xl">
          <div className="p-6 rounded-lg border">
            <Building2 className="h-6 w-6 text-primary mb-3" />
            <h2 className="font-semibold mb-1">Multiempresa</h2>
            <p className="text-sm text-muted-foreground">Cada empresa tem seu próprio espaço isolado e seguro.</p>
          </div>
          <div className="p-6 rounded-lg border">
            <ShieldCheck className="h-6 w-6 text-primary mb-3" />
            <h2 className="font-semibold mb-1">Acesso protegido</h2>
            <p className="text-sm text-muted-foreground">Cada usuário só enxerga os dados da própria organização.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
