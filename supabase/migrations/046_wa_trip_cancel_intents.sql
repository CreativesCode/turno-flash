-- ============================================
-- 046: WhatsApp intents for trip cancellations
-- ============================================
-- Until now cancelling a booking or a whole departure told the passenger
-- nothing, and the dashboard asked the owner to warn everyone by hand.
--
-- Split from 047 for the same reason as 043/044: Postgres refuses to USE an
-- enum value in the same transaction that added it.
--
-- Two intents because they are two different events for the passenger:
--   trip_booking_cancelled   -> the business cancelled THIS booking
--   trip_departure_cancelled -> the whole departure is not happening

ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'trip_booking_cancelled';
ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'trip_departure_cancelled';
