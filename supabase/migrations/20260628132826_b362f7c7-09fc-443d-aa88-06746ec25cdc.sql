REVOKE EXECUTE ON FUNCTION public.ensure_usuario_empresa() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_usuario_empresa_for_user(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_usuario_empresa_for_user(UUID) TO service_role;