// Payloads of the public-booking edge function (PRP-001, migration 029).

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string | null;
  color: string | null;
  requires_approval: boolean;
  max_advance_booking_days: number;
  staff_ids: string[];
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
      organization: { id: string; name: string; slug: string; timezone: string };
      /** Today's date (YYYY-MM-DD) in the business timezone. */
      today: string;
      allow_same_day: boolean;
      services: PublicService[];
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
}

export interface PublicBookingConfirmation {
  status: "confirmed" | "pending";
  appointment_number?: string;
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
  | "server_error";
