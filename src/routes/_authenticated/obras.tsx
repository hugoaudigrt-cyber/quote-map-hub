import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/obras")({
  head: () => ({ meta: [{ title: "Obras | Mapa de Cotações" }] }),
  component: () => (
    <PlaceholderPage title="Obras" description="Gerencie as obras da sua empresa." icon={Building2} />
  ),
});
