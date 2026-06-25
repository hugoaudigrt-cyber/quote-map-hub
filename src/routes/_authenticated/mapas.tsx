import { createFileRoute } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/mapas")({
  head: () => ({ meta: [{ title: "Mapas de Cotação | Mapa de Cotações" }] }),
  component: () => (
    <PlaceholderPage
      title="Mapas de Cotação"
      description="Compare preços e condições entre fornecedores."
      icon={Map}
    />
  ),
});
