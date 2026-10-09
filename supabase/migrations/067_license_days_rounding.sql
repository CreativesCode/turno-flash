-- P3-08: the license countdown was off by one and the grace period ran long.
-- EXTRACT(DAY FROM interval) truncates, so a 7-day trial read "6 días" one
-- second after signing up, the last day read "0 días", and the grace period
-- (days_diff <= 7 on a truncated value) lasted almost 8 days.
-- Days are now rounded up and the grace period ends exactly
-- grace_period_days after the license does. Same signature and return shape;
-- the messages are written for the owner who reads them.
CREATE OR REPLACE FUNCTION public.check_license_status(
  org_id UUID,
  grace_period_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  status license_status,
  days_remaining INTEGER,
  is_usable BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  org_record RECORD;
  now_ts TIMESTAMPTZ;
  grace_end TIMESTAMPTZ;
  days_diff INTEGER;
BEGIN
  now_ts := now();

  SELECT
    o.is_active,
    o.license_start_date,
    o.license_end_date
  INTO org_record
  FROM public.organizations o
  WHERE o.id = org_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'expired'::license_status,
      0,
      false,
      'Organización no encontrada'::TEXT;
    RETURN;
  END IF;

  IF NOT org_record.is_active THEN
    RETURN QUERY SELECT
      'expired'::license_status,
      0,
      false,
      'La organización ha sido desactivada'::TEXT;
    RETURN;
  END IF;

  IF org_record.license_start_date IS NULL OR org_record.license_end_date IS NULL THEN
    RETURN QUERY SELECT
      'no_license'::license_status,
      NULL::INTEGER,
      true,
      'Sin licencia configurada - acceso de prueba'::TEXT;
    RETURN;
  END IF;

  IF now_ts < org_record.license_start_date THEN
    days_diff := CEIL(EXTRACT(EPOCH FROM org_record.license_start_date - now_ts) / 86400)::INTEGER;
    RETURN QUERY SELECT
      'expired'::license_status,
      -days_diff,
      false,
      CASE
        WHEN days_diff = 1 THEN 'La licencia comienza en 1 día'
        ELSE format('La licencia comienza en %s días', days_diff)
      END::TEXT;
    RETURN;
  END IF;

  IF now_ts <= org_record.license_end_date THEN
    days_diff := CEIL(EXTRACT(EPOCH FROM org_record.license_end_date - now_ts) / 86400)::INTEGER;
    RETURN QUERY SELECT
      'active'::license_status,
      days_diff,
      true,
      CASE
        WHEN days_diff > 30 THEN 'Licencia activa'
        WHEN days_diff = 1 THEN 'Te queda 1 día de acceso'
        ELSE format('Te quedan %s días de acceso', days_diff)
      END::TEXT;
    RETURN;
  END IF;

  grace_end := org_record.license_end_date + make_interval(days => grace_period_days);

  IF now_ts <= grace_end THEN
    days_diff := CEIL(EXTRACT(EPOCH FROM grace_end - now_ts) / 86400)::INTEGER;
    RETURN QUERY SELECT
      'grace_period'::license_status,
      days_diff,
      true,
      CASE
        WHEN days_diff = 1 THEN 'Tu licencia venció. Te queda 1 día antes del bloqueo'
        ELSE format('Tu licencia venció. Te quedan %s días antes del bloqueo', days_diff)
      END::TEXT;
    RETURN;
  END IF;

  days_diff := FLOOR(EXTRACT(EPOCH FROM now_ts - org_record.license_end_date) / 86400)::INTEGER;
  RETURN QUERY SELECT
    'expired'::license_status,
    -days_diff,
    false,
    CASE
      WHEN days_diff = 1 THEN 'Tu licencia venció hace 1 día'
      ELSE format('Tu licencia venció hace %s días', days_diff)
    END::TEXT;
END;
$$;
