import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEnsureEmpresa } from "@/hooks/use-empresa";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIAS_FIXAS } from "@/lib/categorias-produto";

const NEW_TOKEN = "__new_categoria__";

type Props = {
  value: string;
  onChange: (v: string) => void;
  allowCreate?: boolean;
  placeholder?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
};

export function CategoriaSelect({
  value,
  onChange,
  allowCreate = false,
  placeholder = "Selecione uma categoria",
  includeAllOption = false,
  allOptionLabel = "Todas as categorias",
}: Props) {
  const ensureEmpresa = useEnsureEmpresa();
  const [custom, setCustom] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadCustom() {
    const { data } = await supabase
      .from("categorias_produto")
      .select("nome")
      .order("nome");
    setCustom((data ?? []).map((c) => c.nome));
  }

  useEffect(() => { loadCustom(); }, []);

  const fixSet = new Set<string>(CATEGORIAS_FIXAS);
  const customSorted = [...custom].filter((c) => !fixSet.has(c)).sort((a, b) => a.localeCompare(b));

  async function handleCreate() {
    const nome = novaCategoria.trim();
    if (!nome) return toast.error("Informe o nome da categoria");
    if (fixSet.has(nome) || custom.includes(nome)) {
      onChange(nome);
      setDialogOpen(false);
      setNovaCategoria("");
      return;
    }
    setSaving(true);
    try {
      const empresa_id = await ensureEmpresa();
      const { error } = await supabase
        .from("categorias_produto")
        .insert({ nome, empresa_id });
      if (error) throw error;
      await loadCustom();
      onChange(nome);
      toast.success("Categoria criada");
      setDialogOpen(false);
      setNovaCategoria("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar categoria");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Select
        value={value || undefined}
        onValueChange={(v) => {
          if (v === NEW_TOKEN) {
            setDialogOpen(true);
            return;
          }
          if (includeAllOption && v === "__all__") {
            onChange("");
            return;
          }
          onChange(v);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeAllOption && (
            <SelectItem value="__all__">{allOptionLabel}</SelectItem>
          )}
          <SelectGroup>
            <SelectLabel>Categorias do sistema</SelectLabel>
            {CATEGORIAS_FIXAS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectGroup>
          {customSorted.length > 0 && (
            <SelectGroup>
              <SelectLabel>Personalizadas</SelectLabel>
              {customSorted.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectGroup>
          )}
          {allowCreate && (
            <>
              <SelectSeparator />
              <SelectItem value={NEW_TOKEN}>+ Nova categoria</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>

      {allowCreate && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Nova categoria</DialogTitle>
              <DialogDescription>
                Categoria personalizada da sua empresa.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                autoFocus
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Salvando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
