REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_usuario_empresa() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_empresa_id() FROM PUBLIC, anon;