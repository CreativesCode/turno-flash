-- 085: optional service categories (one level), service badges and safe category links.
--
-- service_categories and services.category_id exist since 010 but no screen used them.
-- 1. services.badge: optional fixed label (recommended/popular/new/offer). It never
--    changes the order; labels live in config/service-badges.ts.
-- 2. Category names are unique per business (case/space insensitive).
-- 3. A service can only point to a category of its own business: RLS on services only
--    checks the service's org, so a crafted request could reference another org's
--    category. Composite FK; deleting a category only clears category_id (PG15+).
-- 4. service_categories joins realtime, like services (020).
-- 5. public_booking_info also returns each service's category_id and badge, plus the
--    active categories that have at least one listed service. Inactive categories
--    behave as "no category". Body taken from the live definition (068).

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS badge TEXT
  CONSTRAINT services_badge_check
  CHECK (badge IN ('recommended', 'popular', 'new', 'offer'));

COMMENT ON COLUMN public.services.badge IS
  'Optional label shown next to the service: recommended | popular | new | offer';

CREATE UNIQUE INDEX IF NOT EXISTS service_categories_org_name_key
  ON public.service_categories (organization_id, lower(btrim(name)));

ALTER TABLE public.service_categories
  ADD CONSTRAINT service_categories_id_org_key UNIQUE (id, organization_id);

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_category_id_fkey,
  ADD CONSTRAINT services_category_org_fkey
    FOREIGN KEY (category_id, organization_id)
    REFERENCES public.service_categories (id, organization_id)
    ON DELETE SET NULL (category_id);

ALTER TABLE public.service_categories REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_categories;

CREATE OR REPLACE FUNCTION public.public_booking_info(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id UUID;
  v_name TEXT;
  v_slug TEXT;
  v_tz TEXT;
  v_allow_same_day BOOLEAN;
  v_contact_phone TEXT;
  v_services JSONB;
BEGIN
  SELECT o.id, o.name, o.slug, COALESCE(o.timezone, 'UTC'), o.whatsapp_phone
    INTO v_org_id, v_name, v_slug, v_tz, v_contact_phone
  FROM public.organizations o
  WHERE o.slug = lower(btrim(p_slug));

  IF v_org_id IS NULL OR NOT public.public_booking_org_open(v_org_id) THEN
    RETURN jsonb_build_object('available', false);
  END IF;

  SELECT COALESCE(bs.allow_same_day_booking, true) INTO v_allow_same_day
  FROM public.business_settings bs
  WHERE bs.organization_id = v_org_id;

  v_services := COALESCE((
    SELECT jsonb_agg(svc ORDER BY svc_order, svc_name)
    FROM (
      SELECT
        COALESCE(s.sort_order, 0) AS svc_order,
        s.name AS svc_name,
        jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description,
          'duration_minutes', s.duration_minutes,
          'price', s.price,
          'currency', s.currency,
          'color', s.color,
          'category_id', CASE WHEN COALESCE(c.is_active, true) THEN s.category_id END,
          'badge', s.badge,
          'requires_approval', COALESCE(s.requires_approval, false),
          'max_advance_booking_days', COALESCE(s.max_advance_booking_days, 60),
          'staff_ids', (
            SELECT jsonb_agg(st.staff_id ORDER BY st.sort_order)
            FROM public.public_booking_staff_for_service(v_org_id, s.id) st
            WHERE EXISTS (
              SELECT 1 FROM public.staff_availability a
              WHERE a.staff_id = st.staff_id AND COALESCE(a.is_available, true)
            )
          )
        ) AS svc
      FROM public.services s
      LEFT JOIN public.service_categories c ON c.id = s.category_id
      WHERE s.organization_id = v_org_id
        AND COALESCE(s.is_active, false)
        AND COALESCE(s.available_for_online_booking, false)
    ) listed
    WHERE svc -> 'staff_ids' <> 'null'::JSONB
  ), '[]'::JSONB);

  RETURN jsonb_build_object(
    'available', true,
    'organization', jsonb_build_object(
      'id', v_org_id,
      'name', v_name,
      'slug', v_slug,
      'timezone', v_tz,
      'contact_phone', v_contact_phone
    ),
    'today', (now() AT TIME ZONE v_tz)::DATE,
    'allow_same_day', v_allow_same_day,
    'services', v_services,
    'categories', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'description', NULLIF(btrim(c.description), '')
        )
        ORDER BY COALESCE(c.sort_order, 0), c.name
      )
      FROM public.service_categories c
      WHERE c.organization_id = v_org_id
        AND COALESCE(c.is_active, true)
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(v_services) x
          WHERE x ->> 'category_id' = c.id::TEXT
        )
    ), '[]'::JSONB),
    'staff', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'name', COALESCE(
            NULLIF(btrim(m.nickname), ''),
            btrim(m.first_name || ' ' || left(COALESCE(m.last_name, ''), 1) || '.')
          ),
          'color', m.color,
          'photo_url', m.photo_url,
          'work_days', (
            SELECT jsonb_agg(DISTINCT a.day_of_week)
            FROM public.staff_availability a
            WHERE a.staff_id = m.id AND COALESCE(a.is_available, true)
          )
        )
        ORDER BY COALESCE(m.sort_order, 0), m.first_name
      )
      FROM public.staff_members m
      WHERE m.organization_id = v_org_id
        AND COALESCE(m.is_active, false)
        AND COALESCE(m.is_bookable, false)
        AND COALESCE(m.accepts_online_bookings, false)
        AND EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.staff_id = m.id)
        AND EXISTS (
          SELECT 1 FROM public.staff_availability a
          WHERE a.staff_id = m.id AND COALESCE(a.is_available, true)
        )
    ), '[]'::JSONB)
  );
END;
$function$;
