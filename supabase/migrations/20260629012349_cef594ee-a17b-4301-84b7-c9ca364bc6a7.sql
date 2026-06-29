
-- 1. fabricante em produtos
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS fabricante text;

-- 2. fornecedor_produtos (vínculo N:N)
CREATE TABLE public.fornecedor_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX fornecedor_produtos_unique_active
  ON public.fornecedor_produtos (fornecedor_id, produto_id)
  WHERE deleted_at IS NULL;

CREATE INDEX fornecedor_produtos_empresa_idx ON public.fornecedor_produtos(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX fornecedor_produtos_fornecedor_idx ON public.fornecedor_produtos(fornecedor_id) WHERE deleted_at IS NULL;
CREATE INDEX fornecedor_produtos_produto_idx ON public.fornecedor_produtos(produto_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedor_produtos TO authenticated;
GRANT ALL ON public.fornecedor_produtos TO service_role;

ALTER TABLE public.fornecedor_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fp_select_empresa" ON public.fornecedor_produtos
  FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());

CREATE POLICY "fp_insert_empresa" ON public.fornecedor_produtos
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.current_empresa_id());

CREATE POLICY "fp_update_empresa" ON public.fornecedor_produtos
  FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id())
  WITH CHECK (empresa_id = public.current_empresa_id());

CREATE POLICY "fp_delete_empresa" ON public.fornecedor_produtos
  FOR DELETE TO authenticated
  USING (empresa_id = public.current_empresa_id());

CREATE TRIGGER fp_updated_at
  BEFORE UPDATE ON public.fornecedor_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. fornecedor_produto_precos (histórico append-only)
CREATE TABLE public.fornecedor_produto_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_produto_id uuid NOT NULL REFERENCES public.fornecedor_produtos(id) ON DELETE CASCADE,
  preco numeric(14,4) NOT NULL CHECK (preco >= 0),
  data_vigencia date NOT NULL DEFAULT CURRENT_DATE,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fpp_fp_idx ON public.fornecedor_produto_precos(fornecedor_produto_id, data_vigencia DESC, created_at DESC);

GRANT SELECT, INSERT ON public.fornecedor_produto_precos TO authenticated;
GRANT ALL ON public.fornecedor_produto_precos TO service_role;

ALTER TABLE public.fornecedor_produto_precos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fpp_select_empresa" ON public.fornecedor_produto_precos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fornecedor_produtos fp
    WHERE fp.id = fornecedor_produto_id
      AND fp.empresa_id = public.current_empresa_id()
  ));

CREATE POLICY "fpp_insert_empresa" ON public.fornecedor_produto_precos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.fornecedor_produtos fp
    WHERE fp.id = fornecedor_produto_id
      AND fp.empresa_id = public.current_empresa_id()
  ));
-- sem UPDATE / DELETE: histórico append-only
