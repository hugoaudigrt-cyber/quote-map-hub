import { useServerFn } from "@tanstack/react-start";
import { ensureEmpresa } from "@/lib/empresa.functions";

export function useEnsureEmpresa() {
  const ensureEmpresaFn = useServerFn(ensureEmpresa);

  return async () => {
    const result = await ensureEmpresaFn();
    return result.empresa_id;
  };
}