import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, type LucideIcon } from "lucide-react";

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Construction className="h-4 w-4" /> Em desenvolvimento
          </CardTitle>
          <CardDescription>
            Esta seção está sendo construída e estará disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
            <Construction className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum conteúdo por aqui ainda.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
