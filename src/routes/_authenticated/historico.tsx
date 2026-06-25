import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico | Mapa de Cotações" }] }),
  component: () => (
    <PlaceholderPage
      title="Histórico"
      description="Histórico de cotações e compras realizadas."
      icon={History}
    />
  ),
});
