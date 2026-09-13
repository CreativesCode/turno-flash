// Supabase Edge Function: public-trips
//
// Single public entry point of the seat booking page (PRP-002). Invoked with
// the anon key (Authorization: Bearer <anon> + apikey header), exactly like
// public-booking. Every business rule lives in Postgres (migration 033): this
// layer only validates the input shape, resolves the slug and maps error codes
// to user-facing messages.
//
// Two actions instead of the three of public-booking: a departure is a fixed
// row, so there are no time slots to compute.
//
// Body:
//   { action: "info", slug }
//   { action: "book", slug, trip_id, seats, passenger_names,
//                     first_name, last_name, phone, email?, notes?,
//                     website? }   // website = honeypot, must stay empty

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@4.3.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ERROR_MESSAGES: Record<string, string> = {
  booking_closed:
    "Este negocio no está recibiendo reservas de viajes en este momento.",
  invalid_input: "Revisa los datos ingresados.",
  trip_unavailable: "Ese viaje ya no está disponible.",
  trip_departed: "Ese viaje ya salió.",
  too_many_seats: "No puedes reservar esa cantidad de asientos de una vez.",
  not_enough_seats:
    "Ya no quedan asientos suficientes en ese viaje. Elige otra salida, por favor.",
  passenger_names_required:
    "Necesitamos el nombre de cada pasajero para la lista del viaje.",
  too_many_bookings:
    "Ya tienes varias reservas próximas en este negocio. Si necesitas otra, contáctalo directamente.",
  booking_window_closed:
    "Las reservas de este viaje todavía no están abiertas o ya cerraron.",
  pickup_point_required: "Elige dónde quieres que te recojan.",
  pickup_point_invalid: "Ese punto de recogida ya no está disponible.",
  round_trip_unavailable:
    "Ese viaje se vende solo de ida. Actualiza la página, por favor.",
};

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,80}$/);
const uuid = z.string().uuid();

const InfoSchema = z.object({ action: z.literal("info"), slug });

const BookSchema = z
  .object({
    action: z.literal("book"),
    slug,
    trip_id: uuid,
    /** Required when the departure has stops loaded; the RPC checks it. */
    pickup_point_id: uuid.nullish(),
    /** true = seat there and back, which is priced apart (migration 042). */
    round_trip: z.boolean().optional(),
    seats: z.number().int().min(1).max(50),
    // One name per seat: the driver list is nominal. The RPC checks this too.
    passenger_names: z.array(z.string().trim().min(1).max(80)).min(1).max(50),
    first_name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(80),
    // International format: "+" followed by 8-15 digits (spaces/dashes allowed)
    phone: z
      .string()
      .trim()
      .regex(/^\+[\d\s-]{8,24}$/)
      .refine((v) => {
        const digits = v.replace(/\D/g, "").length;
        return digits >= 8 && digits <= 15;
      }),
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional(),
    website: z.string().optional(),
  })
  .refine((b) => b.passenger_names.length === b.seats, {
    path: ["passenger_names"],
  });

const RequestSchema = z.discriminatedUnion("action", [InfoSchema, BookSchema]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const raw = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { success: false, code: "invalid_input", error: ERROR_MESSAGES.invalid_input },
      400
    );
  }
  const body = parsed.data;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    if (body.action === "info") {
      const { data, error } = await admin.rpc("public_trips_info", {
        p_slug: body.slug,
      });
      if (error) throw error;
      return json(data);
    }

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", body.slug)
      .maybeSingle();
    if (orgError) throw orgError;
    if (!org) {
      return json(
        { success: false, code: "booking_closed", error: ERROR_MESSAGES.booking_closed },
        404
      );
    }

    // Honeypot: bots fill every field; humans never see "website". Answer like
    // a pending request so the bot gets no signal, but store nothing.
    if ((body.website ?? "").trim() !== "") {
      return json({ success: true, status: "pending" });
    }

    const { data, error } = await admin.rpc("create_trip_booking", {
      p_org_id: org.id,
      p_trip_id: body.trip_id,
      p_seats: body.seats,
      p_first_name: body.first_name,
      p_last_name: body.last_name,
      p_phone: body.phone,
      p_email: body.email || null,
      p_notes: body.notes || null,
      p_passenger_names: body.passenger_names,
      p_pickup_point_id: body.pickup_point_id ?? null,
      p_round_trip: body.round_trip ?? false,
    });
    // The window is enforced by a trigger, which raises instead of returning
    // a result, so it arrives here as a Postgres error and not as JSON.
    if (error) {
      if (String(error.message ?? "").includes("booking_window_closed")) {
        return json(
          {
            success: false,
            code: "booking_window_closed",
            error: ERROR_MESSAGES.booking_window_closed,
          },
          422
        );
      }
      throw error;
    }

    const result = data as {
      success: boolean;
      error?: string;
      seats_left?: number;
      booking_number?: string;
      status?: string;
      trip_type?: string;
      seats?: number;
      deposit_amount?: number;
      deposit_status?: string;
      hold_expires_at?: string | null;
    };

    if (!result.success) {
      const code = result.error ?? "invalid_input";
      return json(
        {
          success: false,
          code,
          error: ERROR_MESSAGES[code] ?? "No se pudo completar la reserva.",
          ...(result.seats_left !== undefined
            ? { seats_left: result.seats_left }
            : {}),
        },
        code === "not_enough_seats" ? 409 : 422
      );
    }

    return json({
      success: true,
      status: result.status,
      booking_number: result.booking_number,
      trip_type: result.trip_type,
      seats: result.seats,
      deposit_amount: result.deposit_amount,
      deposit_status: result.deposit_status,
      hold_expires_at: result.hold_expires_at ?? null,
    });
  } catch (err) {
    console.error("public-trips error:", err);
    return json(
      { success: false, code: "server_error", error: "Ocurrió un error. Intenta nuevamente." },
      500
    );
  }
});
