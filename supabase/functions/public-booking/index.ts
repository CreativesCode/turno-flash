// Supabase Edge Function: public-booking
//
// Single public entry point of the online booking page (PRP-001). Invoked
// with the anon key (Authorization: Bearer <anon> + apikey header), like
// self-signup. Every business rule lives in Postgres (migration 029): this
// layer only validates the input shape, resolves the slug and maps error codes
// to user-facing messages. WhatsApp is sent by the existing appointments
// INSERT trigger, never from here.
//
// Body:
//   { action: "info",  slug }
//   { action: "slots", slug, service_id, staff_id?, date }
//   { action: "book",  slug, service_id, staff_id?, date, start_time,
//                      first_name, last_name, phone, email?, notes?,
//                      website? }   // website = honeypot, must stay empty

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
    "Este negocio no está recibiendo reservas online en este momento.",
  invalid_input: "Revisa los datos ingresados.",
  service_unavailable: "Ese servicio ya no está disponible para reservar online.",
  slot_taken: "Ese horario acaba de ocuparse. Elige otro, por favor.",
  too_many_bookings:
    "Ya tienes varios turnos próximos en este negocio. Si necesitas otro, contáctalo directamente.",
};

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,80}$/);
const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/);

const InfoSchema = z.object({ action: z.literal("info"), slug });

const SlotsSchema = z.object({
  action: z.literal("slots"),
  slug,
  service_id: uuid,
  staff_id: uuid.nullish(),
  date,
});

const BookSchema = SlotsSchema.extend({
  action: z.literal("book"),
  start_time: time,
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
});

const RequestSchema = z.discriminatedUnion("action", [
  InfoSchema,
  SlotsSchema,
  BookSchema,
]);

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
      const { data, error } = await admin.rpc("public_booking_info", {
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

    if (body.action === "slots") {
      const { data, error } = await admin.rpc("public_booking_slots", {
        p_org_id: org.id,
        p_service_id: body.service_id,
        p_staff_id: body.staff_id ?? null,
        p_date: body.date,
      });
      if (error) throw error;
      const slots = (data ?? []) as { start_time: string; staff_id: string }[];
      return json({
        slots: slots.map((s) => ({
          start_time: String(s.start_time).slice(0, 5),
          staff_id: s.staff_id,
        })),
      });
    }

    // action === "book"
    // Honeypot: bots fill every field; humans never see "website". Answer
    // like a pending request so the bot gets no signal, but store nothing.
    if ((body.website ?? "").trim() !== "") {
      return json({ success: true, status: "pending" });
    }

    const { data, error } = await admin.rpc("create_public_booking", {
      p_org_id: org.id,
      p_service_id: body.service_id,
      p_staff_id: body.staff_id ?? null,
      p_date: body.date,
      p_start: body.start_time,
      p_first_name: body.first_name,
      p_last_name: body.last_name,
      p_phone: body.phone,
      p_email: body.email || null,
      p_notes: body.notes || null,
    });
    if (error) throw error;

    const result = data as {
      success: boolean;
      error?: string;
      status?: string;
      appointment_number?: string;
      staff_id?: string;
      date?: string;
      start_time?: string;
    };

    if (!result.success) {
      const code = result.error ?? "invalid_input";
      return json(
        {
          success: false,
          code,
          error: ERROR_MESSAGES[code] ?? "No se pudo completar la reserva.",
        },
        code === "slot_taken" ? 409 : 422
      );
    }

    return json({
      success: true,
      status: result.status,
      appointment_number: result.appointment_number,
      staff_id: result.staff_id,
      date: result.date,
      start_time: String(result.start_time).slice(0, 5),
    });
  } catch (err) {
    console.error("public-booking error:", err);
    return json(
      { success: false, code: "server_error", error: "Ocurrió un error. Intenta nuevamente." },
      500
    );
  }
});
