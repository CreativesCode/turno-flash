import { createClient } from "@/utils/supabase/client";

/** What a new business already set up, for the "first steps" guide (P2-15). */
export interface SetupProgress {
  services: number;
  staff: number;
  appointments: number;
  trips: number;
  tripBookings: number;
  hasContactPhone: boolean;
  bookingPageEnabled: boolean;
  seatBookingEnabled: boolean;
}

type CountedTable = "services" | "staff_members" | "appointments" | "trips" | "trip_bookings";

export class OnboardingService {
  /** Only asks for the tables of the enabled modules: every request costs on 3G. */
  static async getProgress(
    organizationId: string,
    modules: { appointments: boolean; trips: boolean }
  ): Promise<SetupProgress> {
    const supabase = createClient();
    const count = async (table: CountedTable, enabled: boolean) => {
      if (!enabled) return 0;
      const { count: rows, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      if (error) throw new Error(error.message);
      return rows ?? 0;
    };

    const [services, staff, appointments, trips, tripBookings, org, settings] =
      await Promise.all([
        count("services", modules.appointments),
        count("staff_members", modules.appointments),
        count("appointments", modules.appointments),
        count("trips", modules.trips),
        count("trip_bookings", modules.trips),
        supabase
          .from("organizations")
          .select("whatsapp_phone")
          .eq("id", organizationId)
          .single(),
        supabase
          .from("business_settings")
          .select("booking_page_enabled, seat_booking_enabled")
          .eq("organization_id", organizationId)
          .maybeSingle(),
      ]);
    if (org.error) throw new Error(org.error.message);
    if (settings.error) throw new Error(settings.error.message);

    return {
      services,
      staff,
      appointments,
      trips,
      tripBookings,
      hasContactPhone: !!org.data.whatsapp_phone?.trim(),
      bookingPageEnabled: !!settings.data?.booking_page_enabled,
      seatBookingEnabled: !!settings.data?.seat_booking_enabled,
    };
  }
}
