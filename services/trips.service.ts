import { tripFormSchema } from "@/schemas/trip.schema";
import type {
  PickupPointFormState,
  Trip,
  TripFormData,
  TripPickupPoint,
  TripWithOccupancy,
} from "@/types/trips";
import { downscaleImage } from "@/utils/image";
import { Logger } from "@/utils/logger";

/** Storage bucket holding the photo of each vehicle (migration 041). */
const PHOTO_BUCKET = "trip-photos";

/** Moves an instant by N days, keeping the time of day. */
function shiftByDays(value: string | null, days: number): string | null {
  if (!value) return null;
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
import { createClient } from "@/utils/supabase/client";

/**
 * Service Layer for Trips (seat booking module, PRP-002).
 * Departures live next to the appointment engine and never touch it.
 */
export class TripService {
  private static validate(data: TripFormData): {
    valid: boolean;
    errors: string[];
  } {
    const result = tripFormSchema.safeParse(data);
    if (result.success) return { valid: true, errors: [] };
    return {
      valid: false,
      errors: result.error.issues.map((issue) => issue.message),
    };
  }

  /** Row payload shared by create and update. */
  private static toRow(data: TripFormData) {
    return {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      pickup_location: data.pickup_location?.trim() || null,
      departure_date: data.departure_date,
      departure_time: data.departure_time,
      return_time: data.return_time || null,
      total_seats: data.total_seats,
      max_seats_per_booking: data.max_seats_per_booking,
      price_per_seat: data.price_per_seat,
      deposit_per_seat: data.deposit_per_seat,
      round_trip_enabled: data.round_trip_enabled,
      // Only meaningful when the departure is sold both ways.
      price_round_trip: data.round_trip_enabled
        ? data.price_round_trip
        : null,
      currency: data.currency,
      requires_approval: data.requires_approval,
      is_published: data.is_published,
      driver_name: data.driver_name?.trim() || null,
      driver_phone: data.driver_phone?.trim() || null,
      vehicle_description: data.vehicle_description?.trim() || null,
      vehicle_photo_path: data.vehicle_photo_path || null,
      // datetime-local carries no zone: it is read as the operator's own time.
      booking_opens_at: data.booking_opens_at
        ? new Date(data.booking_opens_at).toISOString()
        : null,
      booking_closes_at: data.booking_closes_at
        ? new Date(data.booking_closes_at).toISOString()
        : null,
      internal_notes: data.internal_notes?.trim() || null,
    };
  }

  // ------------------------------------------
  // Photo of the vehicle (bucket trip-photos, migration 041)
  // ------------------------------------------
  // The bucket is public read, so the URL is built here and needs no session:
  // the public booking page renders it with the anon key.

  static vehiclePhotoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    const supabase = createClient();
    return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /**
   * Uploads the photo and returns its path. The first folder is the
   * organization: that is what the storage policies check.
   */
  static async uploadVehiclePhoto(
    file: File,
    organizationId: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const shrunk = await downscaleImage(file);
      if (shrunk.size > 5 * 1024 * 1024) {
        return { success: false, error: "La foto pesa demasiado" };
      }
      const supabase = createClient();
      const path = `${organizationId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, shrunk, { contentType: shrunk.type, upsert: false });
      if (error) throw error;
      return { success: true, path };
    } catch (error) {
      void Logger.error("Error uploading trip photo", error, { organizationId });
      return { success: false, error: "No se pudo subir la foto" };
    }
  }

  /** Best effort: a photo left behind is noise, a failed save is not. */
  static async removeVehiclePhoto(path: string | null): Promise<void> {
    if (!path) return;
    try {
      const supabase = createClient();
      await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    } catch (error) {
      void Logger.error("Error removing trip photo", error, { path });
    }
  }

  private static async copyVehiclePhoto(
    path: string | null,
    organizationId: string
  ): Promise<string | null> {
    if (!path) return null;
    try {
      const supabase = createClient();
      const target = `${organizationId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .copy(path, target);
      if (error) throw error;
      return target;
    } catch (error) {
      // The copy is a convenience: the duplicate is still worth creating.
      void Logger.error("Error copying trip photo", error, { path });
      return null;
    }
  }

  /**
   * Departures with their live occupancy. Two queries, never one per trip:
   * the seats taken come from a single grouped read of the live bookings.
   */
  static async getAll(
    organizationId: string,
    filters?: { includePast?: boolean }
  ): Promise<{
    success: boolean;
    error?: string;
    trips?: TripWithOccupancy[];
  }> {
    try {
      const supabase = createClient();
      let query = supabase
        .from("trips")
        .select("*")
        .eq("organization_id", organizationId)
        .order("departure_date", { ascending: true })
        .order("departure_time", { ascending: true });

      if (!filters?.includePast) {
        const today = new Date().toISOString().slice(0, 10);
        query = query.gte("departure_date", today);
      }

      const { data: trips, error } = await query;
      if (error) throw error;

      const rows = (trips ?? []) as Trip[];
      if (rows.length === 0) return { success: true, trips: [] };

      const { data: points, error: pointsError } = await supabase
        .from("trip_pickup_points")
        .select("*")
        .in(
          "trip_id",
          rows.map((trip) => trip.id)
        )
        .order("sort_order", { ascending: true });
      if (pointsError) throw pointsError;

      const pointsByTrip = new Map<string, TripPickupPoint[]>();
      for (const point of (points ?? []) as TripPickupPoint[]) {
        const list = pointsByTrip.get(point.trip_id) ?? [];
        list.push(point);
        pointsByTrip.set(point.trip_id, list);
      }

      const { data: bookings, error: bookingsError } = await supabase
        .from("trip_bookings")
        .select("trip_id, seats")
        .in(
          "trip_id",
          rows.map((trip) => trip.id)
        )
        .neq("status", "cancelled");
      if (bookingsError) throw bookingsError;

      const takenByTrip = new Map<string, number>();
      for (const booking of bookings ?? []) {
        takenByTrip.set(
          booking.trip_id,
          (takenByTrip.get(booking.trip_id) ?? 0) + booking.seats
        );
      }

      return {
        success: true,
        trips: rows.map((trip) => {
          const seatsTaken = takenByTrip.get(trip.id) ?? 0;
          return {
            ...trip,
            seats_taken: seatsTaken,
            seats_left: Math.max(trip.total_seats - seatsTaken, 0),
            pickup_points: pointsByTrip.get(trip.id) ?? [],
          };
        }),
      };
    } catch (error) {
      void Logger.error("Error loading trips", error, { organizationId });
      return { success: false, error: "No se pudieron cargar los viajes" };
    }
  }

  /**
   * Stops are replaced wholesale on save: the form owns the list, and a stop
   * that is gone from it was deleted by the user. Bookings keep pointing at a
   * deleted stop as NULL (ON DELETE SET NULL), never losing the booking.
   */
  private static async savePickupPoints(
    tripId: string,
    organizationId: string,
    points: PickupPointFormState[]
  ): Promise<void> {
    const supabase = createClient();
    const kept = points.filter((point) => point.name.trim());

    const { data: existing } = await supabase
      .from("trip_pickup_points")
      .select("id")
      .eq("trip_id", tripId);

    const keptIds = new Set(kept.map((point) => point.id).filter(Boolean));
    const toDelete = (existing ?? [])
      .map((row) => row.id)
      .filter((id) => !keptIds.has(id));

    if (toDelete.length > 0) {
      await supabase.from("trip_pickup_points").delete().in("id", toDelete);
    }

    for (const [index, point] of kept.entries()) {
      const row = {
        organization_id: organizationId,
        trip_id: tripId,
        name: point.name.trim(),
        details: point.details.trim() || null,
        pickup_time: point.pickup_time || null,
        price_per_seat: point.price_per_seat === "" ? 0 : point.price_per_seat,
        // Empty means "charge what the trip charges", not free.
        price_round_trip:
          point.price_round_trip === "" ? null : point.price_round_trip,
        deposit_per_seat:
          point.deposit_per_seat === "" ? 0 : point.deposit_per_seat,
        sort_order: index,
      };
      if (point.id) {
        await supabase.from("trip_pickup_points").update(row).eq("id", point.id);
      } else {
        await supabase.from("trip_pickup_points").insert(row);
      }
    }
  }

  /** A duplicate without its stops has no prices: they live on the stops. */
  private static async copyPickupPoints(
    fromTripId: string,
    toTripId: string,
    organizationId: string
  ): Promise<void> {
    const supabase = createClient();
    const { data: points } = await supabase
      .from("trip_pickup_points")
      .select("*")
      .eq("trip_id", fromTripId)
      .order("sort_order", { ascending: true });

    if (!points || points.length === 0) return;

    await supabase.from("trip_pickup_points").insert(
      (points as TripPickupPoint[]).map((point) => ({
        organization_id: organizationId,
        trip_id: toTripId,
        name: point.name,
        details: point.details,
        pickup_time: point.pickup_time,
        price_per_seat: point.price_per_seat,
        price_round_trip: point.price_round_trip,
        deposit_per_seat: point.deposit_per_seat,
        sort_order: point.sort_order,
      }))
    );
  }

  static async create(
    data: TripFormData,
    organizationId: string,
    timezone: string,
    pickupPoints: PickupPointFormState[] = []
  ): Promise<{ success: boolean; error?: string; trip?: Trip }> {
    const validation = this.validate(data);
    if (!validation.valid) {
      return { success: false, error: validation.errors[0] };
    }

    try {
      const supabase = createClient();
      const { data: created, error } = await supabase
        .from("trips")
        .insert({
          ...this.toRow(data),
          organization_id: organizationId,
          timezone,
        })
        .select()
        .single();
      if (error) throw error;
      await this.savePickupPoints(created.id, organizationId, pickupPoints);
      return { success: true, trip: created as Trip };
    } catch (error) {
      void Logger.error("Error creating trip", error, { organizationId });
      return { success: false, error: "No se pudo crear el viaje" };
    }
  }

  static async update(
    tripId: string,
    data: TripFormData,
    organizationId?: string,
    pickupPoints?: PickupPointFormState[]
  ): Promise<{ success: boolean; error?: string; trip?: Trip }> {
    const validation = this.validate(data);
    if (!validation.valid) {
      return { success: false, error: validation.errors[0] };
    }

    try {
      const supabase = createClient();
      const { data: updated, error } = await supabase
        .from("trips")
        .update(this.toRow(data))
        .eq("id", tripId)
        .select()
        .single();
      if (error) throw error;
      if (pickupPoints && organizationId) {
        await this.savePickupPoints(tripId, organizationId, pickupPoints);
      }
      return { success: true, trip: updated as Trip };
    } catch (error) {
      void Logger.error("Error updating trip", error, { tripId });
      return { success: false, error: "No se pudo actualizar el viaje" };
    }
  }

  /** Publish or unpublish: only changes whether the public page shows it. */
  static async setPublished(
    tripId: string,
    isPublished: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("trips")
        .update({ is_published: isPublished })
        .eq("id", tripId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      void Logger.error("Error publishing trip", error, { tripId });
      return { success: false, error: "No se pudo cambiar la publicación" };
    }
  }

  /**
   * Cancelling a departure keeps it and its passenger list: the business still
   * needs to know who was going in order to warn them.
   */
  static async cancel(
    tripId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("trips")
        .update({ cancelled_at: new Date().toISOString(), is_published: false })
        .eq("id", tripId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      void Logger.error("Error cancelling trip", error, { tripId });
      return { success: false, error: "No se pudo cancelar el viaje" };
    }
  }

  /** Same departure on another date, which is how a recurring route is run. */
  static async duplicate(
    trip: Trip,
    departureDate: string
  ): Promise<{ success: boolean; error?: string; trip?: Trip }> {
    const dayShift = Math.round(
      (new Date(departureDate).getTime() -
        new Date(trip.departure_date).getTime()) /
        86400000
    );
    try {
      const supabase = createClient();
      const { data: created, error } = await supabase
        .from("trips")
        .insert({
          organization_id: trip.organization_id,
          title: trip.title,
          description: trip.description,
          pickup_location: trip.pickup_location,
          departure_date: departureDate,
          departure_time: trip.departure_time,
          return_time: trip.return_time,
          timezone: trip.timezone,
          total_seats: trip.total_seats,
          max_seats_per_booking: trip.max_seats_per_booking,
          price_per_seat: trip.price_per_seat,
          deposit_per_seat: trip.deposit_per_seat,
          round_trip_enabled: trip.round_trip_enabled,
          price_round_trip: trip.price_round_trip,
          currency: trip.currency,
          requires_approval: trip.requires_approval,
          is_published: trip.is_published,
          driver_name: trip.driver_name,
          driver_phone: trip.driver_phone,
          vehicle_description: trip.vehicle_description,
          // A copy of the file, not the same path: otherwise removing the
          // photo from one departure would take it from the other too.
          vehicle_photo_path: await this.copyVehiclePhoto(
            trip.vehicle_photo_path,
            trip.organization_id
          ),
          // The window moves with the trip, otherwise a copy for next week
          // would open (and close) on the original week's dates.
          booking_opens_at: shiftByDays(trip.booking_opens_at, dayShift),
          booking_closes_at: shiftByDays(trip.booking_closes_at, dayShift),
          internal_notes: trip.internal_notes,
        })
        .select()
        .single();
      if (error) throw error;
      await this.copyPickupPoints(trip.id, created.id, trip.organization_id);
      return { success: true, trip: created as Trip };
    } catch (error) {
      void Logger.error("Error duplicating trip", error, { tripId: trip.id });
      return { success: false, error: "No se pudo duplicar el viaje" };
    }
  }
}
