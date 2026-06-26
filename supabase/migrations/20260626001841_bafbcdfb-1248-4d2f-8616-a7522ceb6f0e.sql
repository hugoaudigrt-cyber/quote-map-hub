CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT,
  categoria TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver produtos da empresa" ON public.produtos
  FOR SELECT TO authenticated USING (empresa_id = public.current_empresa_id());

CREATE POLICY "Criar produtos da empresa" ON public.produtos
  FOR INSERT TO authenticated WITH CHECK (empresa_id = public.current_empresa_id());

CREATE POLICY "Atualizar produtos da empresa" ON public.produtos
  FOR UPDATE TO authenticated USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());

CREATE POLICY "Excluir produtos da empresa" ON public.produtos
  FOR DELETE TO authenticated USING (empresa_id = public.current_empresa_id());

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
