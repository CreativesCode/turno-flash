// Edge Function: daily-summary
//
// Envía cada mañana al WhatsApp del negocio (organizations.whatsapp_phone) un
// resumen del día: cuántos turnos hay, cuántos faltan confirmar, ingreso
// estimado y hora del primer turno.
//
// Pensada para ejecutarse vía pg_cron cada 15 minutos (programado en la
// migración 024). En cada corrida revisa qué organizaciones tienen
// `business_settings.enable_daily_summary = true` y cuya hora local
// (timezone de la organización) está dentro de la ventana
// [daily_summary_time, daily_summary_time + 15min). Idempotente: máximo un
// resumen por organización por día local.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  phoneToChatId,
  sendText,
  type OpenWaResponse,
  type SendTextData,
} from "../_shared/openwa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrgSettingsRow {
  organization_id: string;
  openwa_session_id: string | null;
  daily_summary_time: string | null; // "07:00:00"
  organizations: {
    name: string;
    timezone: string | null;
    whatsapp_phone: string | null;
  } | null;
}

interface AppointmentRow {
  id: string;
  status: string;
  start_time: string;
  price_charged: number | null;
  services: { price: number | null } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: targets, error } = await supabase
      .from("business_settings")
      .select(
        "organization_id, openwa_session_id, daily_summary_time, organizations(name, timezone, whatsapp_phone)"
      )
      .eq("enable_daily_summary", true)
      .eq("whatsapp_integration_enabled", true)
      .not("openwa_session_id", "is", null);

    if (error) {
      return json(500, { success: false, error: error.message });
    }

    const results: Array<{ org: string; status: string }> = [];

    for (const row of (targets ?? []) as unknown as OrgSettingsRow[]) {
      const org = row.organizations;
      if (!org?.whatsapp_phone) {
        results.push({ org: row.organization_id, status: "no_phone" });
        continue;
      }

      const tz = org.timezone || "UTC";
      const { localDate, localMinutes } = nowInTimezone(tz);
      const targetMinutes = parseTimeToMinutes(row.daily_summary_time ?? "07:00");

      // Ventana de 15 min alineada al cron */15
      if (localMinutes < targetMinutes || localMinutes >= targetMinutes + 15) {
        results.push({ org: row.organization_id, status: "outside_window" });
        continue;
      }

      // Idempotencia: ¿ya se envió el resumen hoy (día local)?
      const { data: lastSent } = await supabase
        .from("wa_outbound_messages")
        .select("sent_at")
        .eq("organization_id", row.organization_id)
        .eq("intent", "daily_summary")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ sent_at: string }>();

      if (lastSent && dateInTimezone(new Date(lastSent.sent_at), tz) === localDate) {
        results.push({ org: row.organization_id, status: "already_sent" });
        continue;
      }

      // Turnos de hoy (día local de la organización)
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, status, start_time, price_charged, services(price)")
        .eq("organization_id", row.organization_id)
        .eq("appointment_date", localDate);

      const text = buildSummary(
        org.name,
        (appts ?? []) as unknown as AppointmentRow[]
      );

      const chatId = phoneToChatId(org.whatsapp_phone);
      const result: OpenWaResponse<SendTextData> = await sendText({
        sessionId: row.openwa_session_id!,
        chatId,
        text,
      });

      if (result.success && result.data) {
        await supabase.from("wa_outbound_messages").insert({
          organization_id: row.organization_id,
          appointment_id: null,
          intent: "daily_summary",
          chat_id: chatId,
          message_id: result.data.messageId,
          status: "sent",
          body: text,
        });
        results.push({ org: row.organization_id, status: "sent" });
      } else {
        await supabase.from("wa_outbound_messages").insert({
          organization_id: row.organization_id,
          appointment_id: null,
          intent: "daily_summary",
          chat_id: chatId,
          status: "failed",
          body: text,
          error_code: result.error?.code ?? "UNKNOWN",
          error_message: result.error?.message ?? JSON.stringify(result),
        });
        results.push({ org: row.organization_id, status: "failed" });
      }
    }

    return json(200, { success: true, results });
  } catch (err) {
    console.error("[daily-summary] fatal", err);
    return json(500, {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─────────────────────────────────────────────────────────────

const CANCELLED_STATUSES = new Set(["cancelled", "no_show", "rescheduled"]);

function buildSummary(orgName: string, appts: AppointmentRow[]): string {
  const active = appts.filter((a) => !CANCELLED_STATUSES.has(a.status));

  if (active.length === 0) {
    return [
      `☀️ Buenos días! *${orgName}*`,
      ``,
      `Hoy no tienes turnos agendados. 📭`,
      ``,
      `Buen momento para contactar clientes o revisar tu agenda de la semana.`,
    ].join("\n");
  }

  const pending = active.filter((a) => a.status === "pending").length;
  const revenue = active.reduce(
    (sum, a) => sum + (a.price_charged ?? a.services?.price ?? 0),
    0
  );
  const firstTime = active
    .map((a) => a.start_time)
    .sort()[0]
    ?.slice(0, 5);

  const lines = [
    `☀️ Buenos días! *${orgName}*`,
    ``,
    `📅 Hoy tienes *${active.length}* turno${active.length === 1 ? "" : "s"}`,
  ];
  if (pending > 0) {
    lines.push(`⏳ ${pending} pendiente${pending === 1 ? "" : "s"} de confirmar`);
  }
  if (revenue > 0) {
    lines.push(`💰 Ingreso estimado: $${formatNumber(revenue)}`);
  }
  if (firstTime) {
    lines.push(`⏰ Primer turno: ${firstTime}`);
  }
  lines.push(``, `¡Buen día de trabajo! 💪`);

  return lines.join("\n");
}

/** Fecha (YYYY-MM-DD) y minutos del día actuales en una timezone IANA. */
function nowInTimezone(tz: string): { localDate: string; localMinutes: number } {
  const now = new Date();
  return {
    localDate: dateInTimezone(now, tz),
    localMinutes: minutesInTimezone(now, tz),
  };
}

function dateInTimezone(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function minutesInTimezone(d: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  } catch {
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
}

function parseTimeToMinutes(time: string): number {
  const [h = "7", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
