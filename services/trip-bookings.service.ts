import type {
  ManualBookingFormState,
  TripBookingWithCustomer,
} from "@/types/trips";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";

/**
 * Service Layer for trip bookings (PRP-002).
 *
 * The two states never move together, by explicit product decision:
 *   approve/reject -> status         (does the business accept the passenger?)
 *   deposit        -> deposit_status (did the money arrive?)
 * Every method here touches one axis and leaves the other alone.
 */
export class TripBookingService {
  static async getByTrip(tripId: string): Promise<{
    success: boolean;
    error?: string;
    bookings?: TripBookingWithCustomer[];
  }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("trip_bookings")
        .select(
          "*, customer:customers(id, first_name, last_name, phone, email), pickup_point:trip_pickup_points(id, name)"
        )
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return {
        success: true,
        bookings: (data ?? []) as unknown as TripBookingWithCustomer[],
      };
    } catch (error) {
      void Logger.error("Error loading trip bookings", error, { tripId });
      return { success: false, error: "No se pudieron cargar las reservas" };
    }
  }

  /**
   * Money only: never approves, never cancels. What gets stored is how much
   * was actually received; the trigger of migration 037 keeps deposit_status
   * in sync, and what is left to collect is price_total - amount_paid.
   */
  static async setAmountPaid(
    bookingId: string,
    amountPaid: number,
    method?: string,
    extra?: { description: string; amount: number }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("trip_bookings")
        .update({
          amount_paid: Math.max(amountPaid, 0),
          deposit_method: method?.trim() || null,
          ...(extra
            ? {
                extra_description: extra.description.trim() || null,
                extra_amount: Math.max(extra.amount, 0),
              }
            : {}),
        })
        .eq("id", bookingId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      void Logger.error("Error updating trip payment", error, { bookingId });
      return { success: false, error: "No se pudo actualizar el cobro" };
    }
  }

  /** Seat only. Says nothing about the deposit. */
  static async setStatus(
    bookingId: string,
    status: "confirmed" | "cancelled" | "completed" | "no_show",
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("trip_bookings")
        .update({
          status,
          ...(status === "cancelled"
            ? {
                cancelled_at: new Date().toISOString(),
                cancellation_reason: reason?.trim() || "cancelled_by_business",
              }
            : {}),
        })
        .eq("id", bookingId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      void Logger.error("Error updating trip booking status", error, {
        bookingId,
      });
      return { success: false, error: "No se pudo actualizar la reserva" };
    }
  }

  static async updatePassengerNames(
    bookingId: string,
    names: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("trip_bookings")
        .update({
          passenger_names: names.map((name) => name.trim()).filter(Boolean),
        })
        .eq("id", bookingId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      void Logger.error("Error updating passenger names", error, { bookingId });
      return { success: false, error: "No se pudieron guardar los nombres" };
    }
  }

  /**
   * Booking taken by the business (phone, counter). The public page goes
   * through the edge function instead; here the seat check is the one the
   * form already did, plus the database constraints.
   *
   * Unlike the public flow, passenger names are optional: a phone booking gets
   * taken fast and the names are filled in before the trip.
   */
  static async createManual(params: {
    organizationId: string;
    tripId: string;
    form: ManualBookingFormState;
    /** Already resolved by the caller from the chosen stop, or the trip. */
    pricePerSeat: number;
    depositPerSeat: number;
    requiresApproval: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    const { organizationId, tripId, form } = params;
    const seats = form.seats === "" ? 0 : form.seats;

    if (!form.first_name.trim() || !form.last_name.trim()) {
      return { success: false, error: "Falta el nombre de quien reserva" };
    }
    if (seats < 1) {
      return { success: false, error: "Indicá cuántos asientos reserva" };
    }
    // customers.phone is NOT NULL, and without a phone there is no way to warn
    // the passenger if the trip changes.
    if (!form.phone.trim()) {
      return { success: false, error: "Hace falta el teléfono de quien reserva" };
    }

    try {
      const supabase = createClient();

      // Reuse the customer by phone, same idea as the public flow.
      const phone = form.phone.trim();
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let customerId: string | null = existing?.id ?? null;

      if (!customerId) {
        const { data: created, error: customerError } = await supabase
          .from("customers")
          .insert({
            organization_id: organizationId,
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            phone,
            email: form.email.trim() || null,
            is_active: true,
          })
          .select("id")
          .single();
        if (customerError) throw customerError;
        customerId = created.id;
      }

      const depositAmount = params.depositPerSeat * seats;
      const amountPaid = form.amount_paid === "" ? 0 : form.amount_paid;
      const { error } = await supabase.from("trip_bookings").insert({
        organization_id: organizationId,
        trip_id: tripId,
        customer_id: customerId,
        seats,
        passenger_names: form.passenger_names
          .map((name) => name.trim())
          .filter(Boolean),
        status: params.requiresApproval ? "pending" : "confirmed",
        source: "admin",
        trip_type: form.trip_type,
        price_total: params.pricePerSeat * seats,
        deposit_amount: depositAmount,
        // deposit_status and deposit_paid_at are derived by the trigger.
        amount_paid: amountPaid,
        pickup_point_id: form.pickup_point_id || null,
        extra_description: form.extra_description.trim() || null,
        extra_amount: form.extra_amount === "" ? 0 : form.extra_amount,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      void Logger.error("Error creating manual trip booking", error, { tripId });
      return { success: false, error: "No se pudo cargar la reserva" };
    }
  }
}
