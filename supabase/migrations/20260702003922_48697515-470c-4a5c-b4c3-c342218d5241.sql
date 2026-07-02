
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

ALTER FUNCTION public.current_empresa_id() SET SCHEMA private;
GRANT EXECUTE ON FUNCTION private.current_empresa_id() TO authenticated;
