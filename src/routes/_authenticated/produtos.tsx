import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({ meta: [{ title: "Produtos | Mapa de Cotações" }] }),
  component: () => (
    <PlaceholderPage
      title="Produtos"
      description="Catálogo de produtos para cotação."
      icon={Package}
    />
  ),
});
