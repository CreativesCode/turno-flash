// Edge Function: send-reminders
//
// Recorre appointments próximos en las ventanas T-24h y T-1h
// y delega a `wa-send` con el intent correspondiente.
//
// Pensada para ejecutarse vía pg_cron cada 15 minutos:
//   select cron.schedule(
//     'wa-reminders',
//     '*/15 * * * *',
//     $$ select net.http_post(
//       url := 'https://<proyecto>.supabase.co/functions/v1/send-reminders',
//       headers := jsonb_build_object('Authorization','Bearer <service-role>')
//     ); $$
//   );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AppointmentRow {
  id: string;
  organization_id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  reminder_sent_at: string | null;
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

    const now = new Date();
    // Ventana T-24h: appointments entre 23h45m y 24h15m desde ahora
    const w24Start = addMinutes(now, 23 * 60 + 45);
    const w24End = addMinutes(now, 24 * 60 + 15);
    // Ventana T-1h: appointments entre 45min y 1h15m desde ahora
    const w1Start = addMinutes(now, 45);
    const w1End = addMinutes(now, 75);

    const targets24h = await loadInWindow(supabase, w24Start, w24End);
    const targets1h = await loadInWindow(supabase, w1Start, w1End);

    const results = {
      reminder_24h: await dispatchBatch(targets24h, "reminder_24h"),
      reminder_1h: await dispatchBatch(targets1h, "reminder_1h"),
    };

    return json(200, {
      success: true,
      processed_at: now.toISOString(),
      results,
    });
  } catch (err) {
    console.error("[send-reminders] fatal", err);
    return json(500, {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─────────────────────────────────────────────────────────────

async function loadInWindow(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  start: Date,
  end: Date
): Promise<AppointmentRow[]> {
  // Comparamos contra (appointment_date + start_time) construido en SQL
  const { data, error } = await supabase.rpc("wa_appointments_in_window", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });

  if (error) {
    throw error;
  }
  return (data ?? []) as AppointmentRow[];
}

async function dispatchBatch(rows: AppointmentRow[], intent: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const results = await Promise.allSettled(
    rows.map((r) =>
      fetch(`${supabaseUrl}/functions/v1/wa-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ appointmentId: r.id, intent }),
      }).then((res) => ({ id: r.id, status: res.status }))
    )
  );

  return {
    total: rows.length,
    ok: results.filter(
      (r) => r.status === "fulfilled" && r.value.status < 400
    ).length,
    failed: results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.status >= 400)
    ).length,
  };
}

function addMinutes(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60 * 1000);
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
