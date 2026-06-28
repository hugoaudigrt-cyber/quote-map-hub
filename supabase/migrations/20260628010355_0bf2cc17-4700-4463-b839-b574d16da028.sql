
-- Soft delete: add deleted_at column and partial unique indexes

ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.mapas_cotacao ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Replace unique constraints with partial unique indexes (ignore soft-deleted rows)
ALTER TABLE public.fornecedores DROP CONSTRAINT IF EXISTS fornecedores_empresa_cnpj_unique;
CREATE UNIQUE INDEX IF NOT EXISTS fornecedores_empresa_cnpj_active_unique
  ON public.fornecedores (empresa_id, cnpj) WHERE deleted_at IS NULL;

ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_empresa_id_codigo_key;
CREATE UNIQUE INDEX IF NOT EXISTS produtos_empresa_codigo_active_unique
  ON public.produtos (empresa_id, codigo) WHERE deleted_at IS NULL;

ALTER TABLE public.obras DROP CONSTRAINT IF EXISTS obras_empresa_id_codigo_key;
CREATE UNIQUE INDEX IF NOT EXISTS obras_empresa_codigo_active_unique
  ON public.obras (empresa_id, codigo) WHERE deleted_at IS NULL;

ALTER TABLE public.solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_empresa_id_codigo_key;
CREATE UNIQUE INDEX IF NOT EXISTS solicitacoes_empresa_codigo_active_unique
  ON public.solicitacoes (empresa_id, codigo) WHERE deleted_at IS NULL;

ALTER TABLE public.mapas_cotacao DROP CONSTRAINT IF EXISTS mapas_cotacao_empresa_id_codigo_key;
CREATE UNIQUE INDEX IF NOT EXISTS mapas_cotacao_empresa_codigo_active_unique
  ON public.mapas_cotacao (empresa_id, codigo) WHERE deleted_at IS NULL;

-- Helpful indexes for filtering
CREATE INDEX IF NOT EXISTS fornecedores_deleted_at_idx ON public.fornecedores (empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS produtos_deleted_at_idx ON public.produtos (empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS obras_deleted_at_idx ON public.obras (empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS solicitacoes_deleted_at_idx ON public.solicitacoes (empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS mapas_cotacao_deleted_at_idx ON public.mapas_cotacao (empresa_id) WHERE deleted_at IS NULL;
