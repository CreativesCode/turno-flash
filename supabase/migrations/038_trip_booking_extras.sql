-- ============================================
-- 038: Extras charged on top of a booking
-- ============================================
-- Real case from the user: a trip goes to a fixed destination, but a passenger
-- can ask to be taken further (the airport, another embassy, a different drop
-- point) for an extra amount usually paid to the driver.
--
-- One free-text extra with its amount per booking, not a catalogue: every
-- business words it differently and the amount is agreed case by case. The
-- passenger asks for it in the notes of the public page, and the business
-- writes what it costs.

ALTER TABLE public.trip_bookings
  ADD COLUMN IF NOT EXISTS extra_description TEXT,
  ADD COLUMN IF NOT EXISTS extra_amount DECIMAL(10,2) NOT NULL DEFAULT 0
    CHECK (extra_amount >= 0);

COMMENT ON COLUMN public.trip_bookings.extra_amount IS
  'Charged on top of price_total. Total owed = price_total + extra_amount - amount_paid.';
