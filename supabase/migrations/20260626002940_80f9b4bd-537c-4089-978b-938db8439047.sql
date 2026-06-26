
CREATE TYPE public.obra_status AS ENUM ('ativa', 'pausada', 'finalizada');

CREATE TABLE public.obras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  cliente TEXT,
  local TEXT,
  status public.obra_status NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obras TO authenticated;
GRANT ALL ON public.obras TO service_role;

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver obras da empresa" ON public.obras
  FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY "Criar obras da empresa" ON public.obras
  FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY "Atualizar obras da empresa" ON public.obras
  FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY "Excluir obras da empresa" ON public.obras
  FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());

CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-gera codigo OBR-0001 por empresa
CREATE OR REPLACE FUNCTION public.set_obra_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next INT;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::INT), 0) + 1
      INTO v_next
      FROM public.obras
      WHERE empresa_id = NEW.empresa_id;
    NEW.codigo := 'OBR-' || lpad(v_next::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER obras_set_codigo BEFORE INSERT ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.set_obra_codigo();
