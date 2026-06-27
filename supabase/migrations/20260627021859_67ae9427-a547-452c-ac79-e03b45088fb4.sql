
CREATE TYPE public.mapa_status AS ENUM ('aberto','finalizado','cancelado');

CREATE TABLE public.mapas_cotacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE RESTRICT,
  codigo TEXT NOT NULL,
  status public.mapa_status NOT NULL DEFAULT 'aberto',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapas_cotacao TO authenticated;
GRANT ALL ON public.mapas_cotacao TO service_role;
ALTER TABLE public.mapas_cotacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mapas_select" ON public.mapas_cotacao FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());
CREATE POLICY "mapas_insert" ON public.mapas_cotacao FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY "mapas_update" ON public.mapas_cotacao FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());
CREATE POLICY "mapas_delete" ON public.mapas_cotacao FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());

CREATE TRIGGER update_mapas_cotacao_updated_at BEFORE UPDATE ON public.mapas_cotacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_mapa_codigo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_next INT;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::INT), 0) + 1
      INTO v_next FROM public.mapas_cotacao WHERE empresa_id = NEW.empresa_id;
    NEW.codigo := 'MAP-' || lpad(v_next::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_mapa_codigo_trg BEFORE INSERT ON public.mapas_cotacao FOR EACH ROW EXECUTE FUNCTION public.set_mapa_codigo();

CREATE TABLE public.mapa_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapa_id UUID NOT NULL REFERENCES public.mapas_cotacao(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade NUMERIC NOT NULL CHECK (quantidade > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapa_itens TO authenticated;
GRANT ALL ON public.mapa_itens TO service_role;
ALTER TABLE public.mapa_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mapa_itens_all" ON public.mapa_itens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mapas_cotacao m WHERE m.id = mapa_id AND m.empresa_id = public.current_empresa_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mapas_cotacao m WHERE m.id = mapa_id AND m.empresa_id = public.current_empresa_id()));

CREATE TABLE public.mapa_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapa_item_id UUID NOT NULL REFERENCES public.mapa_itens(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  preco NUMERIC(14,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mapa_item_id, fornecedor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapa_precos TO authenticated;
GRANT ALL ON public.mapa_precos TO service_role;
ALTER TABLE public.mapa_precos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mapa_precos_all" ON public.mapa_precos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mapa_itens i JOIN public.mapas_cotacao m ON m.id = i.mapa_id WHERE i.id = mapa_item_id AND m.empresa_id = public.current_empresa_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mapa_itens i JOIN public.mapas_cotacao m ON m.id = i.mapa_id WHERE i.id = mapa_item_id AND m.empresa_id = public.current_empresa_id()));

CREATE TRIGGER update_mapa_precos_updated_at BEFORE UPDATE ON public.mapa_precos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
