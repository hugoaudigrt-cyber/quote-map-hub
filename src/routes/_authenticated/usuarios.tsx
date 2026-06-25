import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários | Mapa de Cotações" }] }),
  component: () => (
    <PlaceholderPage
      title="Usuários"
      description="Gerencie os usuários da sua empresa."
      icon={Users}
    />
  ),
});
