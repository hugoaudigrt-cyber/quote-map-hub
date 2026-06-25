
-- EMPRESAS
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  plano TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- USUARIOS (perfil ligado a auth.users)
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_usuarios_empresa ON public.usuarios(empresa_id);

-- Security definer: empresa_id do usuário logado
CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.usuarios WHERE id = auth.uid();
$$;

-- POLICIES empresas
CREATE POLICY "Usuários veem sua empresa"
  ON public.empresas FOR SELECT TO authenticated
  USING (id = public.current_empresa_id());

CREATE POLICY "Usuários atualizam sua empresa"
  ON public.empresas FOR UPDATE TO authenticated
  USING (id = public.current_empresa_id());

-- POLICIES usuarios
CREATE POLICY "Ver usuários da mesma empresa"
  ON public.usuarios FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id());

CREATE POLICY "Atualizar próprio perfil"
  ON public.usuarios FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Trigger: ao criar usuário em auth.users, cria empresa + usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_nome_empresa TEXT;
  v_nome_usuario TEXT;
  v_cnpj TEXT;
  v_cargo TEXT;
BEGIN
  v_nome_empresa := COALESCE(NEW.raw_user_meta_data->>'nome_empresa', 'Minha Empresa');
  v_nome_usuario := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));
  v_cnpj := NEW.raw_user_meta_data->>'cnpj';
  v_cargo := NEW.raw_user_meta_data->>'cargo';

  INSERT INTO public.empresas (nome, cnpj, plano)
  VALUES (v_nome_empresa, v_cnpj, 'free')
  RETURNING id INTO v_empresa_id;

  INSERT INTO public.usuarios (id, empresa_id, nome, email, cargo)
  VALUES (NEW.id, v_empresa_id, v_nome_usuario, NEW.email, v_cargo);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
