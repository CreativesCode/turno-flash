// Edge Function: wa-campaign
//
// Campaña de reactivación de clientes dormidos ("recuperar clientes").
// Invocada desde la app (supabase.functions.invoke) por un owner/admin.
//
// Request body:
//   { customerIds: string[], message?: string }
//
// - Solo owner/admin con organización pueden invocarla (se valida el JWT).
// - Los clientes deben pertenecer a la organización del usuario.
// - Throttle: máx. 1 mensaje de reactivación cada 30 días por cliente
//   (customers.last_reactivation_sent_at).
// - `message` opcional: si se pasa, se usa como cuerpo reemplazando {nombre}
//   por el nombre del cliente. Si no, se usa el mensaje por defecto.

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

const MAX_PER_REQUEST = 50;
const THROTTLE_DAYS = 30;

interface CustomerRow {
  id: string;
  first_name: string;
  phone: string;
  phone_country_code: string | null;
  whatsapp_number: string | null;
  last_reactivation_sent_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { customerIds, message } = (await req.json()) as {
      customerIds: string[];
      message?: string;
    };

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return json(400, { success: false, error: "customerIds es requerido" });
    }
    if (customerIds.length > MAX_PER_REQUEST) {
      return json(400, {
        success: false,
        error: `Máximo ${MAX_PER_REQUEST} clientes por envío`,
      });
    }

    // 1. Identificar al usuario que invoca (JWT del header)
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return json(401, { success: false, error: "No autenticado" });
    }

    // 2. Verificar rol y organización (con service role)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, organization_id, is_active")
      .eq("user_id", user.id)
      .single<{
        role: string;
        organization_id: string | null;
        is_active: boolean;
      }>();

    if (
      !profile?.is_active ||
      !profile.organization_id ||
      (profile.role !== "owner" && profile.role !== "admin")
    ) {
      return json(403, {
        success: false,
        error: "Solo dueños y administradores con organización pueden enviar campañas",
      });
    }

    const orgId = profile.organization_id;

    // 3. Configuración WA del negocio
    const { data: settings } = await supabase
      .from("business_settings")
      .select("openwa_session_id, whatsapp_integration_enabled")
      .eq("organization_id", orgId)
      .single<{
        openwa_session_id: string | null;
        whatsapp_integration_enabled: boolean;
      }>();

    if (!settings?.whatsapp_integration_enabled || !settings.openwa_session_id) {
      return json(400, {
        success: false,
        error: "WhatsApp no está habilitado para esta organización",
      });
    }

    const { data: orgRow } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single<{ name: string }>();
    const orgName = orgRow?.name ?? "nuestro negocio";

    // 4. Cargar clientes (solo de la organización del usuario)
    const { data: customers } = await supabase
      .from("customers")
      .select(
        "id, first_name, phone, phone_country_code, whatsapp_number, last_reactivation_sent_at"
      )
      .eq("organization_id", orgId)
      .in("id", customerIds);

    const throttleCutoff = new Date(
      Date.now() - THROTTLE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    let sent = 0;
    let skippedThrottled = 0;
    let failed = 0;

    for (const customer of (customers ?? []) as CustomerRow[]) {
      // Throttle: no volver a contactar antes de 30 días
      if (
        customer.last_reactivation_sent_at &&
        customer.last_reactivation_sent_at > throttleCutoff
      ) {
        skippedThrottled++;
        continue;
      }

      const phone = customer.whatsapp_number || customer.phone;
      if (!phone) {
        failed++;
        continue;
      }
      const chatId = phoneToChatId(phone, customer.phone_country_code ?? "");
      const text = buildMessage(customer.first_name, orgName, message);

      const result: OpenWaResponse<SendTextData> = await sendText({
        sessionId: settings.openwa_session_id,
        chatId,
        text,
      });

      if (result.success && result.data) {
        await Promise.all([
          supabase.from("wa_outbound_messages").insert({
            organization_id: orgId,
            appointment_id: null,
            intent: "reactivation",
            chat_id: chatId,
            message_id: result.data.messageId,
            status: "sent",
            body: text,
          }),
          supabase
            .from("customers")
            .update({ last_reactivation_sent_at: new Date().toISOString() })
            .eq("id", customer.id),
        ]);
        sent++;
      } else {
        await supabase.from("wa_outbound_messages").insert({
          organization_id: orgId,
          appointment_id: null,
          intent: "reactivation",
          chat_id: chatId,
          status: "failed",
          body: text,
          error_code: result.error?.code ?? "UNKNOWN",
          error_message: result.error?.message ?? JSON.stringify(result),
        });
        failed++;
      }
    }

    return json(200, {
      success: true,
      sent,
      skipped_throttled: skippedThrottled,
      failed,
      requested: customerIds.length,
    });
  } catch (err) {
    console.error("[wa-campaign] fatal", err);
    return json(500, {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─────────────────────────────────────────────────────────────

function buildMessage(
  customerName: string,
  orgName: string,
  custom?: string
): string {
  if (custom && custom.trim()) {
    return custom.replaceAll("{nombre}", customerName);
  }
  return [
    `Hola ${customerName}! 👋`,
    ``,
    `Hace tiempo que no te vemos por *${orgName}* y te extrañamos 💈`,
    ``,
    `¿Te gustaría agendar un turno? Responde a este mensaje y te reservamos un lugar.`,
  ].join("\n");
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
