import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores | Mapa de Cotações" }] }),
  component: () => (
    <PlaceholderPage
      title="Fornecedores"
      description="Cadastro e gestão de fornecedores."
      icon={Truck}
    />
  ),
});
