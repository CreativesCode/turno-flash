// Edge Function: license-notices
//
// Sends the license notices that run_license_notices() (migration 077) left
// as "requested": reminders, expiry, grace days and block for the owner, and
// expiry and block for the platform admin.
//
// Called once a day by the `license-notices` cron right after it writes the
// notices. Owner notices go to the number stored on the notice; admin notices
// (recipient NULL) go to ADMIN_NOTIFY_PHONE. Both are sent from the platform
// WhatsApp session (ADMIN_NOTIFY_SESSION_ID), the same one self-signup uses.
//
// Never retries: OpenWA answers HTTP 500 for messages it does deliver, so a
// retry would send the notice twice. A 500 is recorded as sent/unconfirmed.

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
// A notice left behind by a failed run is not sent a day late
const MAX_AGE_HOURS = 12;

interface NoticeRow {
  id: string;
  kind: string;
  recipient: string | null;
  message: string;
}

/** OpenWA reports a 500 either as the HTTP status or as `statusCode` in the body. */
function isServerError(
  error: { code: string; details?: unknown } | undefined
): boolean {
  const statusCode = (error?.details as { statusCode?: number } | undefined)
    ?.statusCode;
  return error?.code === "HTTP_500" || statusCode === 500;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only triggers and crons (service role) may call this function.
  if (!isServiceRole(req)) {
    return json(403, { success: false, error: "No autorizado" });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const sessionId = Deno.env.get("ADMIN_NOTIFY_SESSION_ID");
    const adminPhone = Deno.env.get("ADMIN_NOTIFY_PHONE");

    const since = new Date(
      Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000
    ).toISOString();

    // Claim the pending notices: completed_at marks them as taken, so two
    // overlapping calls never send the same one.
    const { data: notices, error } = await supabase
      .from("license_notices")
      .update({ completed_at: new Date().toISOString() })
      .eq("status", "requested")
      .is("completed_at", null)
      .gte("created_at", since)
      .select("id, kind, recipient, message");

    if (error) {
      console.error("[license-notices] claim error:", error.message);
      return json(500, { success: false, error: error.message });
    }

    let sent = 0;
    let failed = 0;

    for (const notice of (notices ?? []) as NoticeRow[]) {
      const phone = notice.recipient ?? adminPhone ?? null;
      let status: "sent" | "failed" = "failed";
      let failureCode: string | null = null;

      if (!sessionId) {
        failureCode = "no_session";
      } else if (!phone) {
        failureCode = "no_phone";
      } else {
        const result = await sendText({
          sessionId,
          chatId: phoneToChatId(phone, DEFAULT_COUNTRY_CODE),
          text: notice.message,
        });
        if (result.success) {
          status = "sent";
        } else if (isServerError(result.error)) {
          status = "sent";
          failureCode = "unconfirmed";
        } else {
          failureCode = (result.error?.code ?? "send_failed").slice(0, 60);
          console.error(
            "[license-notices] send failed:",
            notice.kind,
            result.error?.message
          );
        }
      }

      if (status === "sent") sent++;
      else failed++;

      await supabase
        .from("license_notices")
        .update({
          status,
          failure_code: failureCode,
          completed_at: new Date().toISOString(),
        })
        .eq("id", notice.id);
    }

    return json(200, { success: true, sent, failed });
  } catch (error) {
    console.error("[license-notices] exception:", error);
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : "Error interno",
    });
  }
});
