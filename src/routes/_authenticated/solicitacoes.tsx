import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/solicitacoes")({
  head: () => ({ meta: [{ title: "Solicitações de Compra | Mapa de Cotações" }] }),
  component: () => (
    <PlaceholderPage
      title="Solicitações de Compra"
      description="Crie e acompanhe pedidos de compra."
      icon={FileText}
    />
  ),
});
