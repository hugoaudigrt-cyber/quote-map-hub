
-- 1) Trigger de geração automática de código PRD-XXXXX para produtos
CREATE OR REPLACE FUNCTION public.set_produto_codigo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE v_next INT;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::INT), 0) + 1
      INTO v_next FROM public.produtos WHERE empresa_id = NEW.empresa_id;
    NEW.codigo := 'PRD-' || lpad(v_next::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_produto_codigo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_set_produto_codigo ON public.produtos;
CREATE TRIGGER trg_set_produto_codigo
BEFORE INSERT ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.set_produto_codigo();

-- 2) Tabela categorias_produto
CREATE TABLE IF NOT EXISTS public.categorias_produto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_produto TO authenticated;
GRANT ALL ON public.categorias_produto TO service_role;

ALTER TABLE public.categorias_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_produto_select_own_empresa"
ON public.categorias_produto FOR SELECT
TO authenticated
USING (empresa_id = private.current_empresa_id());

CREATE POLICY "categorias_produto_insert_own_empresa"
ON public.categorias_produto FOR INSERT
TO authenticated
WITH CHECK (empresa_id = private.current_empresa_id());

CREATE POLICY "categorias_produto_update_own_empresa"
ON public.categorias_produto FOR UPDATE
TO authenticated
USING (empresa_id = private.current_empresa_id())
WITH CHECK (empresa_id = private.current_empresa_id());

CREATE POLICY "categorias_produto_delete_own_empresa"
ON public.categorias_produto FOR DELETE
TO authenticated
USING (empresa_id = private.current_empresa_id());
