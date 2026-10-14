// Edge Function: error-notify
//
// Tells the platform admins by WhatsApp, at once, that a new error was logged
// in error_logs: which business, which user, which screen and what failed.
//
// Called by the trigger of migration 079 (pg_net, service role) right after a
// new row is inserted. Repeats of the same error within 24 hours are counted
// on the existing row by increment_error_count() and do not call this again.
//
// Recipients: ERROR_NOTIFY_PHONES (comma-separated), falling back to
// ADMIN_NOTIFY_PHONE. Sent from the platform session ADMIN_NOTIFY_SESSION_ID,
// the same one self-signup and license-notices use. Best effort, no retries:
// OpenWA answers HTTP 500 for messages it does deliver.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { phoneToChatId, sendText } from "../_shared/openwa.ts";
import { isServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Every business on the platform is in Cuba
const DEFAULT_COUNTRY_CODE = "53";
const MAX_DETAIL_CHARS = 300;

const ROLE_LABEL: Record<string, string> = {
  owner: "Dueño",
  admin: "Administrador",
  staff: "Empleado",
};

interface ErrorRow {
  id: string;
  error_message: string;
  error_stack: string | null;
  url: string | null;
  timestamp: string;
  user_id: string | null;
  organization_id: string | null;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** First line of the stack without the "Error: " prefix: what actually failed. */
function errorDetail(stack: string | null): string | null {
  const first = (stack ?? "").split("\n")[0]?.replace(/^\w*Error:\s*/, "").trim();
  if (!first) return null;
  return first.length > MAX_DETAIL_CHARS
    ? first.slice(0, MAX_DETAIL_CHARS) + "…"
    : first;
}

function screenOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function buildMessage(
  row: ErrorRow,
  orgName: string | null,
  userName: string | null,
  role: string | null
): string {
  const when = new Date(row.timestamp).toLocaleString("es", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Havana",
  });
  const roleLabel = role ? ROLE_LABEL[role] ?? role : null;
  const who = userName
    ? roleLabel
      ? `${userName} (${roleLabel})`
      : userName
    : null;
  const detail = errorDetail(row.error_stack);
  const screen = screenOf(row.url);

  const lines = [
    `⚠️ *Turno Flash: error en producción*`,
    ``,
    `Negocio: ${orgName ?? (row.organization_id ? "desconocido" : "sin negocio (usuario de plataforma)")}`,
  ];
  if (who) lines.push(`Usuario: ${who}`);
  if (screen) lines.push(`Pantalla: ${screen}`);
  lines.push(`Cuándo: ${when}`, ``, `Error: ${row.error_message}`);
  if (detail && detail !== row.error_message) lines.push(`Detalle: ${detail}`);
  lines.push(``, `Más en el panel → Errores del sistema.`);
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only the trigger (service role) may call this function.
  if (!isServiceRole(req)) {
    return json(403, { success: false, error: "No autorizado" });
  }

  try {
    const { errorLogId } = (await req.json().catch(() => ({}))) as {
      errorLogId?: string;
    };
    if (!errorLogId) {
      return json(400, { success: false, error: "errorLogId requerido" });
    }

    const sessionId = Deno.env.get("ADMIN_NOTIFY_SESSION_ID");
    const phones = (
      Deno.env.get("ERROR_NOTIFY_PHONES") ??
      Deno.env.get("ADMIN_NOTIFY_PHONE") ??
      ""
    )
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    if (!sessionId || phones.length === 0) {
      console.warn(
        "[error-notify] ADMIN_NOTIFY_SESSION_ID o ERROR_NOTIFY_PHONES sin configurar; se omite el aviso"
      );
      return json(200, { success: true, skipped: "not_configured" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: row, error } = await supabase
      .from("error_logs")
      .select(
        "id, error_message, error_stack, url, timestamp, user_id, organization_id"
      )
      .eq("id", errorLogId)
      .maybeSingle();

    if (error || !row) {
      console.error("[error-notify] error_logs lookup:", error?.message);
      return json(404, { success: false, error: "error_log no encontrado" });
    }
    const errorRow = row as ErrorRow;

    let orgName: string | null = null;
    if (errorRow.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", errorRow.organization_id)
        .maybeSingle();
      orgName = (org as { name: string } | null)?.name ?? null;
    }

    let userName: string | null = null;
    let role: string | null = null;
    if (errorRow.user_id) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, email, role")
        .eq("user_id", errorRow.user_id)
        .maybeSingle();
      const p = profile as
        | { full_name: string | null; email: string | null; role: string | null }
        | null;
      userName = p?.full_name || p?.email || null;
      role = p?.role ?? null;
    }

    const text = buildMessage(errorRow, orgName, userName, role);

    let sent = 0;
    let failed = 0;
    for (const phone of phones) {
      const result = await sendText({
        sessionId,
        chatId: phoneToChatId(phone, DEFAULT_COUNTRY_CODE),
        text,
      });
      // HTTP 500 from OpenWA still delivers (see openwa.ts); count it as sent.
      const statusCode = (
        result.error?.details as { statusCode?: number } | undefined
      )?.statusCode;
      if (result.success || result.error?.code === "HTTP_500" || statusCode === 500) {
        sent++;
      } else {
        failed++;
        console.error(
          "[error-notify] send failed:",
          phone,
          result.error?.message
        );
      }
    }

    return json(200, { success: true, sent, failed });
  } catch (error) {
    console.error("[error-notify] exception:", error);
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : "Error interno",
    });
  }
});
