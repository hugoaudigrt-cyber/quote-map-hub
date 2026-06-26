
CREATE TYPE public.solicitacao_status AS ENUM ('aberta', 'em_cotacao', 'finalizada', 'cancelada');

CREATE TABLE public.solicitacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE RESTRICT,
  codigo TEXT NOT NULL,
  status public.solicitacao_status NOT NULL DEFAULT 'aberta',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes TO authenticated;
GRANT ALL ON public.solicitacoes TO service_role;

ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver solicitacoes da empresa" ON public.solicitacoes
  FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY "Criar solicitacoes da empresa" ON public.solicitacoes
  FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY "Atualizar solicitacoes da empresa" ON public.solicitacoes
  FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY "Excluir solicitacoes da empresa" ON public.solicitacoes
  FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());

CREATE TRIGGER update_solicitacoes_updated_at BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_solicitacao_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_next INT;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::INT), 0) + 1
      INTO v_next FROM public.solicitacoes WHERE empresa_id = NEW.empresa_id;
    NEW.codigo := 'SOL-' || lpad(v_next::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER solicitacoes_set_codigo BEFORE INSERT ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_solicitacao_codigo();

CREATE TABLE public.solicitacao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade NUMERIC(14,4) NOT NULL CHECK (quantidade > 0),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitacao_itens_solicitacao ON public.solicitacao_itens(solicitacao_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacao_itens TO authenticated;
GRANT ALL ON public.solicitacao_itens TO service_role;

ALTER TABLE public.solicitacao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver itens da empresa" ON public.solicitacao_itens
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.solicitacoes s WHERE s.id = solicitacao_id AND s.empresa_id = public.current_empresa_id())
  );
CREATE POLICY "Criar itens da empresa" ON public.solicitacao_itens
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.solicitacoes s WHERE s.id = solicitacao_id AND s.empresa_id = public.current_empresa_id())
  );
CREATE POLICY "Atualizar itens da empresa" ON public.solicitacao_itens
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.solicitacoes s WHERE s.id = solicitacao_id AND s.empresa_id = public.current_empresa_id())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.solicitacoes s WHERE s.id = solicitacao_id AND s.empresa_id = public.current_empresa_id())
  );
CREATE POLICY "Excluir itens da empresa" ON public.solicitacao_itens
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.solicitacoes s WHERE s.id = solicitacao_id AND s.empresa_id = public.current_empresa_id())
  );
