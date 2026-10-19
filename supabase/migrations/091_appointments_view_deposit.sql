-- 091: the dashboard reads appointments through appointments_with_details, whose column list was
-- frozen when it was created, so it lacks the deposit columns of 090. Same view, same order, the
-- five deposit columns appended at the end (CREATE OR REPLACE keeps the grants).

CREATE OR REPLACE VIEW public.appointments_with_details
WITH (security_invoker = true) AS
 SELECT a.id,
    a.organization_id,
    a.appointment_number,
    a.customer_id,
    a.service_id,
    a.staff_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.timezone,
    a.actual_start_time,
    a.actual_end_time,
    a.status,
    a.source,
    a.confirmation_sent_at,
    a.reminder_sent_at,
    a.client_confirmed_at,
    a.reminder_method,
    a.notes,
    a.internal_notes,
    a.cancellation_reason,
    a.cancelled_by,
    a.cancelled_at,
    a.price_charged,
    a.was_paid,
    a.payment_method,
    a.rating,
    a.feedback,
    a.created_by,
    a.created_at,
    a.updated_at,
    c.first_name AS customer_first_name,
    c.last_name AS customer_last_name,
    c.phone AS customer_phone,
    c.email AS customer_email,
    s.name AS service_name,
    s.duration_minutes,
    s.price AS service_price,
    st.first_name AS staff_first_name,
    st.last_name AS staff_last_name,
    st.nickname AS staff_nickname,
    o.name AS organization_name,
    o.timezone AS organization_timezone,
    a.deposit_amount,
    a.deposit_status,
    a.deposit_waived,
    a.deposit_verified_by,
    a.deposit_verified_at
   FROM appointments a
     JOIN customers c ON a.customer_id = c.id
     JOIN services s ON a.service_id = s.id
     LEFT JOIN staff_members st ON a.staff_id = st.id
     JOIN organizations o ON a.organization_id = o.id;
