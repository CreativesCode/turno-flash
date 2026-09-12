import type {
  PublicBookingConfirmation,
  PublicBookingErrorCode,
  PublicBookingInfo,
  PublicBookingRequest,
  PublicSlot,
} from "@/types/public-booking";

/**
 * Client of the public-booking edge function (PRP-001). Used by the public
 * /book page, without session: it authenticates with the anon key like
 * /register does with self-signup. Every rule is enforced server-side.
 */

export class PublicBookingError extends Error {
  constructor(
    public code: PublicBookingErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PublicBookingError";
  }
}

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new PublicBookingError("server_error", "Falta configuración del servicio.");
  }

  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/public-booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new PublicBookingError(
      "server_error",
      "No hay conexión. Revisa tu internet e intenta de nuevo."
    );
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || (data && data.success === false)) {
    throw new PublicBookingError(
      (data?.code as PublicBookingErrorCode) ?? "server_error",
      data?.error ?? "Ocurrió un error. Intenta nuevamente."
    );
  }
  return data as T;
}

export class PublicBookingService {
  static getInfo(slug: string): Promise<PublicBookingInfo> {
    return call<PublicBookingInfo>({ action: "info", slug });
  }

  static async getSlots(params: {
    slug: string;
    serviceId: string;
    staffId: string | null;
    date: string;
  }): Promise<PublicSlot[]> {
    const data = await call<{ slots: PublicSlot[] }>({
      action: "slots",
      slug: params.slug,
      service_id: params.serviceId,
      staff_id: params.staffId,
      date: params.date,
    });
    return data.slots ?? [];
  }

  static book(request: PublicBookingRequest): Promise<PublicBookingConfirmation> {
    return call<PublicBookingConfirmation>({ action: "book", ...request });
  }
}
