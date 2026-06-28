import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { ensureEmpresa } from "@/lib/empresa.functions";

export function useEnsureEmpresa() {
  const ensureEmpresaFn = useServerFn(ensureEmpresa);

  return useCallback(async () => {
    const result = await ensureEmpresaFn();
    return result.empresa_id;
  }, [ensureEmpresaFn]);
}