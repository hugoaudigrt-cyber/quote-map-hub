import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/empresa")({
  head: () => ({ meta: [{ title: "Empresa | Mapa de Cotações" }] }),
  component: () => (
    <PlaceholderPage
      title="Empresa"
      description="Configurações e dados da sua empresa."
      icon={Settings}
    />
  ),
});
