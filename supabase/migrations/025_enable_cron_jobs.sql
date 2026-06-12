-- Migración: Habilitar pg_cron y programar los jobs de WhatsApp
-- Ejecutar después de 024_engagement_features.sql
--
-- La 024 detectó que pg_cron NO estaba habilitado en el proyecto, por lo que:
--   - send-reminders (recordatorios T-24h / T-1h) no corría automáticamente
--     (el comentario de la función ya pedía pg_cron; ver docs/REMINDERS-SETUP.md)
--   - daily-summary quedó sin programar
--
-- Ambos jobs son seguros ante dobles ejecuciones: wa-send es idempotente por
-- (appointment, intent) y daily-summary registra un envío por org por día local.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  -- Recordatorios T-24h y T-1h (cada 15 minutos)
  PERFORM cron.schedule(
    'wa-reminders',
    '*/15 * * * *',
    $cron$
    SELECT net.http_post(
      url := (SELECT value FROM public.app_config WHERE key = 'SUPABASE_URL') || '/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY')
      )
    );
    $cron$
  );

  -- Resumen diario al dueño (cada 15 minutos; la función decide a qué org le toca)
  PERFORM cron.schedule(
    'wa-daily-summary',
    '*/15 * * * *',
    $cron$
    SELECT net.http_post(
      url := (SELECT value FROM public.app_config WHERE key = 'SUPABASE_URL') || '/functions/v1/daily-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY')
      )
    );
    $cron$
  );

  RAISE NOTICE 'cron programados: wa-reminders y wa-daily-summary (*/15)';
END $$;
