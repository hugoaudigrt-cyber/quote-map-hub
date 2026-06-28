CREATE OR REPLACE FUNCTION public.ensure_usuario_empresa_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_usuario public.usuarios%ROWTYPE;
  v_auth_user RECORD;
  v_nome_empresa TEXT;
  v_nome_usuario TEXT;
  v_cnpj TEXT;
  v_cargo TEXT;
  v_meta_empresa_id TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não informado';
  END IF;

  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE id = _user_id;

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
  WHERE id = _user_id;

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
  VALUES (_user_id, v_empresa_id, v_nome_usuario, COALESCE(v_auth_user.email, 'usuario-' || _user_id::TEXT || '@local'), v_cargo)
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

REVOKE EXECUTE ON FUNCTION public.ensure_usuario_empresa() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_usuario_empresa_for_user(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_usuario_empresa_for_user(UUID) TO service_role;