-- P0-21: deleting an account left it half deleted.
-- These audit columns pointed at auth.users with NO ACTION, so
-- auth.admin.deleteUser failed for anyone who had ever created or
-- cancelled something. The business data must survive the person who
-- typed it, so the reference is cleared instead.

alter table public.appointment_requests
  drop constraint appointment_requests_approved_by_fkey,
  add constraint appointment_requests_approved_by_fkey
    foreign key (approved_by) references auth.users (id) on delete set null;

alter table public.appointments
  drop constraint appointments_created_by_fkey,
  add constraint appointments_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null,
  drop constraint appointments_cancelled_by_fkey,
  add constraint appointments_cancelled_by_fkey
    foreign key (cancelled_by) references auth.users (id) on delete set null;

alter table public.customer_history
  drop constraint customer_history_created_by_fkey,
  add constraint customer_history_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;

alter table public.customers
  drop constraint customers_created_by_fkey,
  add constraint customers_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;

alter table public.trips
  drop constraint trips_created_by_fkey,
  add constraint trips_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;

alter table public.trip_bookings
  drop constraint trip_bookings_created_by_fkey,
  add constraint trip_bookings_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null,
  drop constraint trip_bookings_cancelled_by_fkey,
  add constraint trip_bookings_cancelled_by_fkey
    foreign key (cancelled_by) references auth.users (id) on delete set null;
