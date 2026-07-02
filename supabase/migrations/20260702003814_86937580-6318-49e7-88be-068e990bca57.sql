
REVOKE EXECUTE ON FUNCTION public.ensure_usuario_empresa() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_usuario_empresa_for_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_obra_codigo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_solicitacao_codigo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_mapa_codigo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
