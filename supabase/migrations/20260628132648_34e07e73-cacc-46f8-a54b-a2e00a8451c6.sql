ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Ver usuários da mesma empresa" ON public.usuarios;
DROP POLICY IF EXISTS "Atualizar próprio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários veem sua empresa" ON public.empresas;
DROP POLICY IF EXISTS "Usuários atualizam sua empresa" ON public.empresas;

CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM public.usuarios
  WHERE id = auth.uid()
    AND deleted_at IS NULL;
$$;

CREATE POLICY "Usuários veem sua empresa"
  ON public.empresas FOR SELECT TO authenticated
  USING (id = public.current_empresa_id());

CREATE POLICY "Usuários atualizam sua empresa"
  ON public.empresas FOR UPDATE TO authenticated
  USING (id = public.current_empresa_id())
  WITH CHECK (id = public.current_empresa_id());

CREATE POLICY "Ver usuários ativos da mesma empresa"
  ON public.usuarios FOR SELECT TO authenticated
  USING (empresa_id = public.current_empresa_id() AND deleted_at IS NULL);

CREATE POLICY "Atualizar usuários ativos da mesma empresa"
  ON public.usuarios FOR UPDATE TO authenticated
  USING (empresa_id = public.current_empresa_id() AND deleted_at IS NULL)
  WITH CHECK (empresa_id = public.current_empresa_id());

CREATE OR REPLACE FUNCTION public.ensure_usuario_empresa()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_empresa_id UUID;
  v_usuario public.usuarios%ROWTYPE;
  v_auth_user RECORD;
  v_nome_empresa TEXT;
  v_nome_usuario TEXT;
  v_cnpj TEXT;
  v_cargo TEXT;
  v_meta_empresa_id TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE id = v_user_id;

  IF FOUND AND v_usuario.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Usuário inativo';
  END IF;

  IF FOUND
    AND v_usuario.empresa_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.empresas WHERE id = v_usuario.empresa_id)
  THEN
    RETURN v_usuario.empresa_id;
  END IF;

  SELECT email, raw_user_meta_data, raw_app_meta_data
    INTO v_auth_user
  FROM auth.users
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário autenticado não localizado';
  END IF;

  v_nome_empresa := COALESCE(NULLIF(v_auth_user.raw_user_meta_data->>'nome_empresa', ''), 'Minha Empresa');
  v_nome_usuario := COALESCE(NULLIF(v_auth_user.raw_user_meta_data->>'nome', ''), NULLIF(split_part(COALESCE(v_auth_user.email, ''), '@', 1), ''), 'Usuário');
  v_cnpj := NULLIF(regexp_replace(COALESCE(v_auth_user.raw_user_meta_data->>'cnpj', ''), '\D', '', 'g'), '');
  v_cargo := NULLIF(v_auth_user.raw_user_meta_data->>'cargo', '');
  v_meta_empresa_id := COALESCE(v_auth_user.raw_app_meta_data->>'empresa_id', '');

  IF v_meta_empresa_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     AND EXISTS (SELECT 1 FROM public.empresas WHERE id = v_meta_empresa_id::UUID)
  THEN
    v_empresa_id := v_meta_empresa_id::UUID;
  ELSE
    INSERT INTO public.empresas (nome, cnpj, plano)
    VALUES (v_nome_empresa, v_cnpj, 'free')
    RETURNING id INTO v_empresa_id;
  END IF;

  INSERT INTO public.usuarios (id, empresa_id, nome, email, cargo)
  VALUES (v_user_id, v_empresa_id, v_nome_usuario, COALESCE(v_auth_user.email, 'usuario-' || v_user_id::TEXT || '@local'), v_cargo)
  ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id,
        email = EXCLUDED.email,
        nome = COALESCE(NULLIF(public.usuarios.nome, ''), EXCLUDED.nome),
        cargo = COALESCE(public.usuarios.cargo, EXCLUDED.cargo),
        deleted_at = NULL,
        updated_at = now();

  RETURN v_empresa_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_usuario_empresa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_usuario_empresa() TO service_role;

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
  v_meta_empresa_id TEXT;
BEGIN
  v_nome_empresa := COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome_empresa', ''), 'Minha Empresa');
  v_nome_usuario := COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''), 'Usuário');
  v_cnpj := NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cnpj', ''), '\D', '', 'g'), '');
  v_cargo := NULLIF(NEW.raw_user_meta_data->>'cargo', '');
  v_meta_empresa_id := COALESCE(NEW.raw_app_meta_data->>'empresa_id', '');

  IF v_meta_empresa_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     AND EXISTS (SELECT 1 FROM public.empresas WHERE id = v_meta_empresa_id::UUID)
  THEN
    v_empresa_id := v_meta_empresa_id::UUID;
  ELSE
    INSERT INTO public.empresas (nome, cnpj, plano)
    VALUES (v_nome_empresa, v_cnpj, 'free')
    RETURNING id INTO v_empresa_id;
  END IF;

  INSERT INTO public.usuarios (id, empresa_id, nome, email, cargo)
  VALUES (NEW.id, v_empresa_id, v_nome_usuario, COALESCE(NEW.email, 'usuario-' || NEW.id::TEXT || '@local'), v_cargo)
  ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id,
        email = EXCLUDED.email,
        nome = EXCLUDED.nome,
        cargo = EXCLUDED.cargo,
        deleted_at = NULL,
        updated_at = now();

  RETURN NEW;
END;
$$;