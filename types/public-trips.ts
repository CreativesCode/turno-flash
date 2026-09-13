// Payloads of the public-trips edge function (PRP-002, migration 033).

/** A stop of the departure, with what it costs to board there. */
export interface PublicPickupPoint {
  id: string;
  name: string;
  details: string | null;
  /** HH:MM:SS when the bus passes by, or null. */
  pickup_time: string | null;
  price_per_seat: number;
  /** Already resolved server-side: falls back to the trip's own price. */
  price_round_trip: number;
  deposit_per_seat: number;
}

export interface PublicTrip {
  id: string;
  title: string;
  description: string | null;
  pickup_location: string | null;
  /** YYYY-MM-DD, local date of the business */
  departure_date: string;
  /** HH:MM:SS, local time of the business */
  departure_time: string;
  return_time: string | null;
  price_per_seat: number;
  deposit_per_seat: number;
  /** The departure is also sold there and back, at price_round_trip. */
  round_trip_enabled: boolean;
  price_round_trip: number;
  currency: string;
  /** true = the booking is born pending and the business has to approve it */
  requires_approval: boolean;
  total_seats: number;
  max_seats_per_booking: number;
  /** Free seats right now, computed server-side. */
  seats_left: number;
  /** false = listed, but not bookable yet (or no longer). */
  booking_open: boolean;
  booking_opens_at: string | null;
  booking_closes_at: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_description: string | null;
  /** Path inside the public trip-photos bucket; the page builds the URL. */
  vehicle_photo_path: string | null;
  pickup_points: PublicPickupPoint[];
}

export type PublicTripsInfo =
  | { available: false }
  | {
      available: true;
      organization: {
        id: string;
        name: string;
        timezone: string;
        /** ISO code every amount on the page is formatted with. */
        currency: string;
        /** How to pay the deposit, written by the business. */
        deposit_instructions: string | null;
      };
      trips: PublicTrip[];
    };

export interface PublicTripBookingRequest {
  slug: string;
  trip_id: string;
  seats: number;
  /** One name per seat, in order. The first one is whoever books. */
  passenger_names: string[];
  /** Required when the departure has stops loaded. */
  pickup_point_id?: string | null;
  /** true = seat there and back, priced apart. */
  round_trip?: boolean;
  first_name: string;
  last_name: string;
  /** International format: + followed by 8-15 digits */
  phone: string;
  email?: string;
  notes?: string;
  /** Honeypot: must stay empty, humans never see it. */
  website?: string;
}

export interface PublicTripBookingConfirmation {
  success: true;
  /** 'pending' = waiting for approval; 'confirmed' = seat is theirs. */
  status: "pending" | "confirmed";
  booking_number?: string;
  seats?: number;
  trip_type?: "one_way" | "round_trip";
  deposit_amount?: number;
  /** 'waived' when the departure asks for no deposit. */
  deposit_status?: "pending" | "paid" | "refunded" | "waived";
  /** Deadline to send the deposit; null when there is none. */
  hold_expires_at?: string | null;
}

export type PublicTripsErrorCode =
  | "booking_closed"
  | "invalid_input"
  | "trip_unavailable"
  | "trip_departed"
  | "too_many_seats"
  | "not_enough_seats"
  | "passenger_names_required"
  | "too_many_bookings"
  | "booking_window_closed"
  | "pickup_point_required"
  | "pickup_point_invalid"
  | "round_trip_unavailable"
  | "server_error";
