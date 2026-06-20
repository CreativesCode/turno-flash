-- =====================================================================
-- RPC `public.ping()` — endpoint trivial para keepalive.
--
-- Supabase free pausa el proyecto tras ~7 días sin actividad en la BD.
-- Esta función la invoca un GitHub Actions cron diariamente vía
-- POST /rest/v1/rpc/ping con la anon key, manteniendo el proyecto activo.
--
-- "Tocar la API REST" no basta: el contador de inactividad de Supabase
-- mide actividad en la BASE DE DATOS, no en el edge. Un RPC SQL garantiza
-- que el ping cuenta como actividad real.
--
-- Retorna `now()` para que el ping sea observable en los logs del workflow.
-- Ver .github/workflows/keep-supabase-alive.yml
-- =====================================================================
create or replace function public.ping()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
