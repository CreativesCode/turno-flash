-- ============================================
-- 043: WhatsApp intents for the seat booking module
-- ============================================
-- Split in two migrations on purpose: Postgres refuses to USE an enum value in
-- the same transaction that added it, and the triggers of 044 use these.
--
-- One intent per EVENT, not per state: approving a booking and receiving its
-- deposit are different things and the passenger has to be told each one.

ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'trip_booked';
ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'trip_approved';
ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'trip_deposit_paid';
ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'trip_notify_business';

-- The log is shared with appointments; a row belongs to one or the other.
ALTER TABLE public.wa_outbound_messages
  ADD COLUMN IF NOT EXISTS trip_booking_id UUID
    REFERENCES public.trip_bookings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_wa_outbound_trip_booking
  ON public.wa_outbound_messages(trip_booking_id, intent)
  WHERE trip_booking_id IS NOT NULL;

COMMENT ON COLUMN public.wa_outbound_messages.trip_booking_id IS
  'Set for messages of the seat booking module; appointment_id stays NULL.';
