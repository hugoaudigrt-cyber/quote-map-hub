-- Create produto_fornecedor table for N:N relationship with pricing details
CREATE TABLE IF NOT EXISTS public.produto_fornecedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  preco numeric(14,2),
  prazo_entrega text,
  marca text,
  codigo_fornecedor text,
  observacoes text,
  data_ultima_atualizacao timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS produto_fornecedor_unique_ativo
  ON public.produto_fornecedor (produto_id, fornecedor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS produto_fornecedor_empresa_idx ON public.produto_fornecedor (empresa_id);
CREATE INDEX IF NOT EXISTS produto_fornecedor_produto_idx ON public.produto_fornecedor (produto_id);
CREATE INDEX IF NOT EXISTS produto_fornecedor_fornecedor_idx ON public.produto_fornecedor (fornecedor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_fornecedor TO authenticated;
GRANT ALL ON public.produto_fornecedor TO service_role;

ALTER TABLE public.produto_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produto_fornecedor select empresa"
  ON public.produto_fornecedor FOR SELECT
  TO authenticated
  USING (empresa_id = public.current_empresa_id());

CREATE POLICY "produto_fornecedor insert empresa"
  ON public.produto_fornecedor FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id());

CREATE POLICY "produto_fornecedor update empresa"
  ON public.produto_fornecedor FOR UPDATE
  TO authenticated
  USING (empresa_id = public.current_empresa_id())
  WITH CHECK (empresa_id = public.current_empresa_id());

CREATE POLICY "produto_fornecedor delete empresa"
  ON public.produto_fornecedor FOR DELETE
  TO authenticated
  USING (empresa_id = public.current_empresa_id());

CREATE TRIGGER trg_produto_fornecedor_updated_at
  BEFORE UPDATE ON public.produto_fornecedor
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
