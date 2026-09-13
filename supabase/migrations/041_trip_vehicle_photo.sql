-- ============================================
-- 041: Photo of the vehicle (Supabase Storage)
-- ============================================
-- Real agencies send the customer a photo of the bus the day before the trip,
-- so they recognise it at the stop. One photo per departure, always optional.
--
-- The column stores the PATH inside the bucket, not the URL: the public URL is
-- built by the client with getPublicUrl(), so the project URL never gets
-- frozen into thousands of rows.

-- --------------------------------------------
-- 1. Bucket
-- --------------------------------------------
-- Public read on purpose: the photo is shown on the public booking page, which
-- runs with the anon key and no session. Nothing personal goes in here.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-photos',
  'trip-photos',
  true,
  5242880, -- 5 MB: a phone photo after client-side downscaling
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- --------------------------------------------
-- 2. Who can write into it
-- --------------------------------------------
-- Layout: <organization_id>/<file>. The first folder IS the tenant boundary,
-- same rule as every table of the module: only admin/owner of that org.

DROP POLICY IF EXISTS "Owners can upload trip photos of their org" ON storage.objects;
CREATE POLICY "Owners can upload trip photos of their org"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trip-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

DROP POLICY IF EXISTS "Owners can replace trip photos of their org" ON storage.objects;
CREATE POLICY "Owners can replace trip photos of their org"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'trip-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

DROP POLICY IF EXISTS "Owners can delete trip photos of their org" ON storage.objects;
CREATE POLICY "Owners can delete trip photos of their org"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trip-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

-- --------------------------------------------
-- 3. The column
-- --------------------------------------------

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS vehicle_photo_path TEXT;

COMMENT ON COLUMN public.trips.vehicle_photo_path IS
  'Path inside the trip-photos bucket (<organization_id>/<file>). NULL = no photo.';

-- --------------------------------------------
-- 4. The public page needs it
-- --------------------------------------------
-- Same body as migration 039 plus vehicle_photo_path.

CREATE OR REPLACE FUNCTION public.public_trips_info(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $trips_info$
DECLARE
  v_org RECORD;
  v_tz TEXT;
  v_trips JSONB;
BEGIN
  SELECT o.id, o.name, o.timezone, o.currency, bs.deposit_instructions
    INTO v_org
  FROM public.organizations o
  LEFT JOIN public.business_settings bs ON bs.organization_id = o.id
  WHERE o.slug = p_slug;

  IF v_org.id IS NULL OR NOT public.public_trips_org_open(v_org.id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_closed');
  END IF;

  v_tz := COALESCE(v_org.timezone, 'UTC');

  SELECT COALESCE(jsonb_agg(t ORDER BY t.departure_date, t.departure_time), '[]'::jsonb)
    INTO v_trips
  FROM (
    SELECT tr.id,
           tr.title,
           tr.description,
           tr.pickup_location,
           tr.departure_date,
           tr.departure_time,
           tr.return_time,
           tr.price_per_seat,
           tr.deposit_per_seat,
           tr.currency,
           tr.requires_approval,
           tr.total_seats,
           tr.max_seats_per_booking,
           tr.driver_name,
           tr.driver_phone,
           tr.vehicle_description,
           tr.vehicle_photo_path,
           tr.booking_opens_at,
           tr.booking_closes_at,
           -- Listed even before it opens, so the page can say "opens on…".
           (tr.booking_opens_at IS NULL OR tr.booking_opens_at <= now())
             AND (tr.booking_closes_at IS NULL OR tr.booking_closes_at > now())
             AS booking_open,
           GREATEST(tr.total_seats - public.trip_seats_taken(tr.id), 0) AS seats_left,
           COALESCE((
             SELECT jsonb_agg(
                      jsonb_build_object(
                        'id', pp.id,
                        'name', pp.name,
                        'details', pp.details,
                        'pickup_time', pp.pickup_time,
                        'price_per_seat', pp.price_per_seat,
                        'deposit_per_seat', pp.deposit_per_seat
                      )
                      ORDER BY pp.sort_order, pp.name
                    )
             FROM public.trip_pickup_points pp
             WHERE pp.trip_id = tr.id
           ), '[]'::jsonb) AS pickup_points
    FROM public.trips tr
    WHERE tr.organization_id = v_org.id
      AND tr.is_published
      AND tr.cancelled_at IS NULL
      AND (tr.departure_date + tr.departure_time) >= (now() AT TIME ZONE v_tz)
  ) t;

  RETURN jsonb_build_object(
    'success', true,
    'organization', jsonb_build_object(
      'id', v_org.id,
      'name', v_org.name,
      'timezone', v_tz,
      'currency', COALESCE(v_org.currency, 'USD'),
      'deposit_instructions', v_org.deposit_instructions
    ),
    'trips', v_trips
  );
END;
$trips_info$;
