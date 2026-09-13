import type {
  PublicTrip,
  PublicTripBookingConfirmation,
  PublicTripBookingRequest,
  PublicTripsErrorCode,
  PublicTripsInfo,
} from "@/types/public-trips";

/**
 * Client of the public-trips edge function (PRP-002). Used by the public
 * /trips page, without session: it authenticates with the anon key like
 * /book does with public-booking. Every rule is enforced server-side.
 */

export class PublicTripsError extends Error {
  constructor(
    public code: PublicTripsErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PublicTripsError";
  }
}

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new PublicTripsError("server_error", "Falta configuración del servicio.");
  }

  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/public-trips`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new PublicTripsError(
      "server_error",
      "No hay conexión. Revisa tu internet e intenta de nuevo."
    );
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || (data && data.success === false)) {
    throw new PublicTripsError(
      (data?.code as PublicTripsErrorCode) ?? "server_error",
      data?.error ?? "Ocurrió un error. Intenta nuevamente."
    );
  }
  return data as T;
}

export class PublicTripsService {
  /**
   * A business with the module off or the page unpublished is not an error:
   * it is the normal "not available" state of the page.
   */
  static async getInfo(slug: string): Promise<PublicTripsInfo> {
    try {
      const data = await call<{
        organization: {
          id: string;
          name: string;
          timezone: string;
          currency: string;
          deposit_instructions: string | null;
        };
        trips: PublicTrip[];
      }>({ action: "info", slug });
      return {
        available: true,
        organization: data.organization,
        trips: data.trips ?? [],
      };
    } catch (error) {
      if (error instanceof PublicTripsError && error.code === "booking_closed") {
        return { available: false };
      }
      throw error;
    }
  }

  static book(
    request: PublicTripBookingRequest
  ): Promise<PublicTripBookingConfirmation> {
    return call<PublicTripBookingConfirmation>({ action: "book", ...request });
  }
}
