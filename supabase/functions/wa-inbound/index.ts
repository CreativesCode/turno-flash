// Edge Function: wa-inbound
//
// Recibe webhooks de OpenWA (message.received, message.ack, session.status)
// y dispara la lógica de negocio correspondiente:
//   - Reply "OK"/"SI"/"CONFIRMO"  → marca client_confirmed + notifica al negocio
//   - Reply "CANCELAR"/"NO"       → cancela appointment + notifica al negocio
//   - message.ack                 → actualiza estado del envío
//   - session.status              → log + notif al admin si se desconecta

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  chatIdToPhone,
  sendText,
  verifyWebhookSignature,
} from "../_shared/openwa.ts";

interface WebhookEnvelope {
  event: string;
  sessionId: string;
  deliveryId?: string;
  idempotencyKey?: string;
  data: Record<string, unknown>;
  signature?: string;
}

const WEBHOOK_SECRET = Deno.env.get("OPENWA_WEBHOOK_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  // Parsear primero — necesitamos el envelope para verificar firma y rutear
  let envelope: WebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // 1. Verificar firma HMAC (solo si hay secret configurado).
  //    La firma puede venir en varios headers o en el campo `signature`.
  if (WEBHOOK_SECRET) {
    const signature =
      req.headers.get("x-openwa-signature") ||
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-hub-signature-256") ||
      envelope.signature ||
      null;

    const sigOk = await verifyWebhookSignature({
      rawBody,
      parsed: envelope,
      signature,
      secret: WEBHOOK_SECRET,
      debug: true,
    });

    if (!sigOk) {
      console.warn("[wa-inbound] firma inválida — rechazado 401");
      return new Response("Invalid signature", { status: 401 });
    }
    console.log("[wa-inbound] firma verificada OK");
  } else {
    console.warn(
      "[wa-inbound] OPENWA_WEBHOOK_SECRET no configurado — ¡firma NO verificada! Sólo usar en desarrollo."
    );
  }

  // DEBUG: dumpear el envelope completo para entender qué manda OpenWA
  console.log(
    "[wa-inbound] envelope:",
    JSON.stringify(envelope).slice(0, 800)
  );

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 2. Idempotencia
  // OpenWA puede mandar `idempotencyKey: "msg_unknown"` (literal) en todos los
  // mensajes, lo que rompe la deduplicación si confiamos solo en eso. Caemos
  // en orden a: header de idempotency, envelope.idempotencyKey si es útil,
  // data.id (message id de WhatsApp, único por mensaje), deliveryId.
  const isBogusKey = (k: string | null | undefined): boolean =>
    !k || k === "msg_unknown" || k === "unknown" || k === "msg_";

  const headerKey = req.headers.get("x-openwa-idempotency-key");
  const envelopeKey = envelope.idempotencyKey;
  const messageId =
    (envelope.data as { id?: string } | undefined)?.id ?? null;
  const deliveryId = envelope.deliveryId ?? null;

  let idemKey: string;
  if (!isBogusKey(headerKey)) idemKey = headerKey!;
  else if (!isBogusKey(envelopeKey)) idemKey = envelopeKey!;
  else if (messageId) idemKey = `msgid:${messageId}`;
  else if (deliveryId) idemKey = `dlv:${deliveryId}`;
  else idemKey = `evt:${envelope.event}:${Date.now()}`;

  console.log(`[wa-inbound] idemKey="${idemKey}"`);

  const { error: dupErr } = await supabase
    .from("wa_processed_events")
    .insert({
      idempotency_key: idemKey,
      event_type: envelope.event,
    });

  if (dupErr && dupErr.code === "23505") {
    console.log(`[wa-inbound] duplicate_ignored (idemKey="${idemKey}")`);
    return json(200, { status: "duplicate_ignored" });
  }
  if (dupErr) {
    console.error(
      "[wa-inbound] idempotency insert failed (continuamos igual)",
      dupErr.message
    );
  }

  // 3. Routing por tipo de evento
  console.log(`[wa-inbound] routing event="${envelope.event}"`);
  try {
    switch (envelope.event) {
      case "message.received":
        await handleMessageReceived(supabase, envelope);
        break;
      case "message.sent":
        console.log("[wa-inbound] message.sent (echo) — skip");
        break;
      case "message.ack":
        await handleAck(supabase, envelope);
        break;
      case "session.status":
      case "session.connected":
      case "session.disconnected":
      case "session.qr":
        await handleSessionStatus(supabase, envelope);
        break;
      default:
        console.log("[wa-inbound] ignored event", envelope.event);
    }

    console.log("[wa-inbound] processed OK");
    return json(200, { status: "processed" });
  } catch (err) {
    console.error("[wa-inbound] processing failed", err);
    return json(500, {
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─────────────────────────────────────────────────────────────

async function handleMessageReceived(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  env: WebhookEnvelope
) {
  const data = env.data as {
    from: string;
    body?: string;
    type?: string;
    isGroup?: boolean;
    fromMe?: boolean;
  };

  console.log(
    `[wa-inbound] handleMessageReceived from=${data.from} type=${data.type} fromMe=${data.fromMe} isGroup=${data.isGroup} body="${(data.body ?? "").slice(0, 40)}"`
  );

  if (data.fromMe || data.isGroup) {
    console.log("[wa-inbound] skip: fromMe or isGroup");
    return;
  }

  // Ignorar notificaciones internas de WhatsApp (e2e_notification,
  // call_log, group_notification, etc.) — solo procesar mensajes de chat reales.
  if (data.type && data.type !== "chat") {
    console.log(`[wa-inbound] skip: type=${data.type} (no es chat)`);
    return;
  }

  // Mensajes sin cuerpo (stickers vacíos, media sin caption, etc.) — ignorar.
  if (!data.body || !data.body.trim()) {
    console.log("[wa-inbound] skip: empty body");
    return;
  }

  const intent = classifyReply(data.body);
  console.log(`[wa-inbound] classifyReply → ${intent ?? "null"}`);

  // Resolver organización por session_id
  const { data: settings, error: settingsErr } = await supabase
    .from("business_settings")
    .select("organization_id")
    .eq("openwa_session_id", env.sessionId)
    .single<{ organization_id: string }>();

  if (settingsErr) {
    console.error(
      `[wa-inbound] business_settings lookup error for session=${env.sessionId}:`,
      settingsErr.message
    );
  }

  if (!settings) {
    console.warn(
      `[wa-inbound] session not mapped to org: ${env.sessionId}`
    );
    return;
  }

  console.log(
    `[wa-inbound] resolved org=${settings.organization_id} for session=${env.sessionId}`
  );

  // Resolver el appointment asociado a este chat.
  // Estrategia (en orden):
  //   1. Match exacto por message_id que contiene `data.from` (más fiable —
  //      WhatsApp usa @lid para cuentas con privacidad, distinto del @c.us
  //      que usamos al enviar; el messageId que devuelve OpenWA incluye el
  //      chatId real entregado, así que ese es el ground truth).
  //   2. Fallback: match por sufijo del número en chat_id (cubre el caso
  //      en que message_id no contiene el `from` por la razón que sea).
  const from = data.from ?? "";
  const fromDigits = from.replace(/[^0-9]/g, "");
  const matchSuffix =
    fromDigits.length >= 8
      ? fromDigits.slice(-Math.min(10, fromDigits.length))
      : fromDigits;

  console.log(
    `[wa-inbound] resolving outbound for from="${from}" (suffix="${matchSuffix}")`
  );

  const OPEN_INTENTS = [
    "confirm",
    "reminder_24h",
    "reminder_1h",
    "reminder_manual",
  ];

  // 1) Match por message_id (contiene el chatId real entregado)
  let { data: lastOutbound } = await supabase
    .from("wa_outbound_messages")
    .select("appointment_id, sent_at, chat_id, message_id")
    .eq("organization_id", settings.organization_id)
    .ilike("message_id", `%_${from}_%`)
    .not("appointment_id", "is", null)
    .in("intent", OPEN_INTENTS)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      appointment_id: string;
      sent_at: string;
      chat_id: string;
      message_id: string;
    }>();

  // 2) Fallback: match por sufijo en chat_id
  if (!lastOutbound?.appointment_id && matchSuffix) {
    const fb = await supabase
      .from("wa_outbound_messages")
      .select("appointment_id, sent_at, chat_id, message_id")
      .eq("organization_id", settings.organization_id)
      .ilike("chat_id", `%${matchSuffix}@c.us`)
      .not("appointment_id", "is", null)
      .in("intent", OPEN_INTENTS)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        appointment_id: string;
        sent_at: string;
        chat_id: string;
        message_id: string;
      }>();
    lastOutbound = fb.data;
  }

  if (!lastOutbound?.appointment_id) {
    console.log(
      `[wa-inbound] no matching appointment for from="${from}" suffix="${matchSuffix}" in org ${settings.organization_id}`
    );
    return;
  }

  console.log(
    `[wa-inbound] matched appointment=${lastOutbound.appointment_id} via chat_id=${lastOutbound.chat_id} message_id=${lastOutbound.message_id}`
  );

  const appointmentId = lastOutbound.appointment_id;

  // Si no se entendió → mandar mensaje de clarificación (con throttle)
  if (!intent) {
    console.log(
      `[wa-inbound] unclassified reply from ${data.from}: "${(data.body ?? "").slice(
        0,
        80
      )}"`
    );
    await maybeSendClarify(supabase, appointmentId);
    return;
  }

  if (intent === "confirm") {
    console.log(
      `[wa-inbound] applying CONFIRM to appointment ${appointmentId}`
    );
    const { error: updErr, count } = await supabase
      .from("appointments")
      .update(
        {
          client_confirmed_at: new Date().toISOString(),
          status: "client_confirmed",
        },
        { count: "exact" }
      )
      .eq("id", appointmentId)
      .neq("status", "cancelled");

    if (updErr) {
      console.error(
        `[wa-inbound] confirm UPDATE failed:`,
        updErr.message
      );
    } else {
      console.log(
        `[wa-inbound] confirm UPDATE OK, rows affected=${count ?? "?"}`
      );
    }

    await Promise.all([
      invokeWaSend(appointmentId, "confirm_ack"),
      invokeWaSend(appointmentId, "notify_business_confirm"),
    ]);
  } else if (intent === "cancel") {
    console.log(
      `[wa-inbound] applying CANCEL to appointment ${appointmentId}`
    );
    const { error: updErr, count } = await supabase
      .from("appointments")
      .update(
        {
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: "Cancelado por cliente vía WhatsApp",
        },
        { count: "exact" }
      )
      .eq("id", appointmentId);

    if (updErr) {
      console.error(
        `[wa-inbound] cancel UPDATE failed:`,
        updErr.message
      );
    } else {
      console.log(
        `[wa-inbound] cancel UPDATE OK, rows affected=${count ?? "?"}`
      );
    }

    // NOTA: cancel_ack al cliente lo dispara el DB trigger
    // `trg_wa_on_appointment_cancel` automáticamente cuando el UPDATE de
    // status='cancelled' se commitea. Acá solo notificamos al negocio.
    await invokeWaSend(appointmentId, "notify_business_cancel");
  }
}

// deno-lint-ignore no-explicit-any
async function handleAck(supabase: any, env: WebhookEnvelope) {
  const data = env.data as { messageId: string; ack: number };
  const statusMap: Record<number, string> = {
    2: "sent",
    3: "delivered",
    4: "read",
  };
  const newStatus = statusMap[data.ack];
  if (!newStatus) return;

  const update: Record<string, unknown> = { status: newStatus };
  if (newStatus === "delivered") update.delivered_at = new Date().toISOString();
  if (newStatus === "read") update.read_at = new Date().toISOString();

  await supabase
    .from("wa_outbound_messages")
    .update(update)
    .eq("message_id", data.messageId);
}

// deno-lint-ignore no-explicit-any
async function handleSessionStatus(supabase: any, env: WebhookEnvelope) {
  // Soporta dos formatos:
  //   - session.status con data.status = "DISCONNECTED" | "CONNECTED" | ...
  //   - session.connected / session.disconnected / session.qr (sin data.status)
  const data = env.data as { status?: string };
  const derived =
    env.event === "session.disconnected"
      ? "DISCONNECTED"
      : env.event === "session.connected"
        ? "CONNECTED"
        : env.event === "session.qr"
          ? "SCAN_QR"
          : (data.status ?? "UNKNOWN");

  console.log(`[wa-inbound] session ${env.sessionId} → ${derived}`);

  if (derived !== "DISCONNECTED" && derived !== "FAILED") return;

  const { data: settings } = await supabase
    .from("business_settings")
    .select("organization_id")
    .eq("openwa_session_id", env.sessionId)
    .single<{ organization_id: string }>();

  if (!settings) return;

  await supabase.from("notifications").insert({
    organization_id: settings.organization_id,
    user_id: null,
    type: "wa_session_down",
    title: "WhatsApp desconectado",
    message: `La sesión OpenWA ${env.sessionId} cambió a estado ${derived}. Re-escaneá el QR.`,
  });
}

/** Clasifica la respuesta de un cliente: confirmación, cancelación o ninguna.
 *  Tolerante a mayúsculas, acentos, puntuación y palabras adicionales:
 *  - "ok", "OK!", "Ok gracias"            → confirm
 *  - "Si dale", "Sí, voy", "CONFIRMO"     → confirm
 *  - "No puedo", "cancelar por favor"     → cancel
 *  - "Hola, queria preguntar..."          → null
 */
function classifyReply(body: string): "confirm" | "cancel" | null {
  // Normalizar: trim → upper → quitar acentos → quitar puntuación
  const normalized = body
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quitar diacríticos
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return null;

  const CONFIRM = new Set([
    "OK",
    "SI",
    "CONFIRMO",
    "CONFIRMADO",
    "CONFIRMAR",
    "DALE",
    "YES",
    "ASISTO",
    "VOY",
    "PERFECTO",
    "BARBARO",
  ]);
  const CANCEL = new Set([
    "NO",
    "CANCELAR",
    "CANCELO",
    "CANCELADO",
    "CANCEL",
    "ANULAR",
    "ANULO",
    "REAGENDAR",
  ]);

  // Match exacto sobre el mensaje completo
  if (CONFIRM.has(normalized)) return "confirm";
  if (CANCEL.has(normalized)) return "cancel";

  // Match sobre la primera palabra (captura "OK gracias", "Cancelar por favor")
  const firstWord = normalized.split(" ")[0];
  if (CONFIRM.has(firstWord)) return "confirm";
  if (CANCEL.has(firstWord)) return "cancel";

  return null;
}

async function invokeWaSend(appointmentId: string, intent: string) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/wa-send`;
  console.log(`[wa-inbound] invokeWaSend(${intent}) for ${appointmentId}`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ appointmentId, intent }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      console.warn(
        `[wa-inbound] wa-send (${intent}) returned ${res.status}: ${bodyText.slice(0, 300)}`
      );
    } else {
      console.log(
        `[wa-inbound] wa-send (${intent}) OK: ${bodyText.slice(0, 200)}`
      );
    }
  } catch (err) {
    console.error(
      `[wa-inbound] wa-send (${intent}) FETCH FAILED:`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

/** Dispara un clarify al cliente, pero a lo sumo 1 cada 12h por appointment
 *  para no spammear si el cliente sigue escribiendo cosas que no entendemos.
 */
async function maybeSendClarify(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  appointmentId: string
) {
  const twelveHoursAgo = new Date(
    Date.now() - 12 * 60 * 60 * 1000
  ).toISOString();

  console.log(
    `[wa-inbound] maybeSendClarify check for appointment ${appointmentId}`
  );

  const { data: recentClarify, error: clarifyErr } = await supabase
    .from("wa_outbound_messages")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("intent", "clarify")
    .gte("sent_at", twelveHoursAgo)
    .limit(1)
    .maybeSingle();

  if (clarifyErr) {
    console.error(
      "[wa-inbound] clarify lookup error:",
      clarifyErr.message
    );
  }

  if (recentClarify) {
    console.log(
      `[wa-inbound] clarify ya enviado en últimas 12h para appointment ${appointmentId}, skip`
    );
    return;
  }

  console.log(
    `[wa-inbound] sending clarify for appointment ${appointmentId}`
  );
  await invokeWaSend(appointmentId, "clarify");
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Suppress unused import warning
void chatIdToPhone;
void sendText;
