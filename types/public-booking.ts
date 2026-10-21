// Payloads of the public-booking edge function (PRP-001, migration 029).

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string | null;
  color: string | null;
  /** null = no category (or its category is inactive) */
  category_id: string | null;
  /** One of SERVICE_BADGES keys; anything else is ignored */
  badge: string | null;
  requires_approval: boolean;
  /** Deposit asked to book it (migration 090); null = none. */
  deposit_amount: number | null;
  /** The deposit is due this many hours before the appointment (093). */
  deposit_due_hours: number | null;
  /** What the price includes, cancellation and refunds (093). */
  payment_terms: string | null;
  max_advance_booking_days: number;
  staff_ids: string[];
}

/** Active category with at least one listed service (migration 085). */
export interface PublicCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface PublicStaff {
  id: string;
  name: string;
  color: string | null;
  photo_url: string | null;
  /** Postgres DOW with at least one schedule range (0 = Sunday). */
  work_days: number[] | null;
}

export type PublicBookingInfo =
  | { available: false }
  | {
      available: true;
      organization: {
        id: string;
        name: string;
        slug: string;
        timezone: string;
        /** WhatsApp of the business, if it loaded one. */
        contact_phone: string | null;
      };
      /** Today's date (YYYY-MM-DD) in the business timezone. */
      today: string;
      allow_same_day: boolean;
      services: PublicService[];
      /** Empty when the business does not use categories */
      categories: PublicCategory[];
      staff: PublicStaff[];
    };

export interface PublicSlot {
  /** HH:MM, local time of the business */
  start_time: string;
  staff_id: string;
}

export interface PublicBookingRequest {
  slug: string;
  service_id: string;
  /** null = "no preference" */
  staff_id: string | null;
  date: string;
  start_time: string;
  first_name: string;
  last_name: string;
  /** International format, e.g. "+54 9 11 5555-0101" */
  phone: string;
  email?: string;
  notes?: string;
  /** Honeypot: must stay empty */
  website?: string;
  /** Idempotency key: a retry with the same key returns the same booking */
  request_key?: string;
}

export interface PublicBookingConfirmation {
  status: "confirmed" | "pending";
  appointment_number?: string;
  /** The booking waits for this deposit (migration 090). */
  deposit_amount?: number | null;
  /** How to pay it, as the business wrote it in Ajustes (WhatsApp format). */
  deposit_instructions?: string | null;
  /** ISO: last moment to pay the deposit (093). */
  deposit_due_at?: string | null;
  payment_terms?: string | null;
  staff_id?: string;
  date?: string;
  start_time?: string;
}

export type PublicBookingErrorCode =
  | "booking_closed"
  | "invalid_input"
  | "service_unavailable"
  | "slot_taken"
  | "too_many_bookings"
  | "server_error"
  /** The request never reached the server (no signal) */
  | "network";
