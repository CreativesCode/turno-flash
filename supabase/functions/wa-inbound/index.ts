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
  resolveContactPhone,
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

// What the handler did with an event; stored on wa_processed_events (080)
// because the function logs are not reachable from our tools.
interface Outcome {
  organizationId?: string;
  result: string;
}

function compactPayload(env: WebhookEnvelope): Record<string, unknown> {
  const d = (env.data ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 80) : v);
  const obj = (v: unknown) =>
    v && typeof v === "object" ? JSON.stringify(v).slice(0, 200) : undefined;
  return {
    sessionId: env.sessionId,
    keys: Object.keys(d).slice(0, 40),
    id: str(d.id),
    from: str(d.from),
    to: str(d.to),
    author: str(d.author),
    chatId: str(d.chatId),
    type: d.type,
    fromMe: d.fromMe,
    isGroup: d.isGroup,
    body: str(d.body),
    senderPhone: str(d.senderPhone),
    sender: obj(d.sender),
    chat: obj(d.chat),
  };
}

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
      payload: compactPayload(envelope),
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
    let outcome: Outcome | null = null;
    switch (envelope.event) {
      case "message.received":
        outcome = await handleMessageReceived(supabase, envelope);
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

    if (outcome) {
      await supabase
        .from("wa_processed_events")
        .update({
          organization_id: outcome.organizationId ?? null,
          result: outcome.result.slice(0, 300),
        })
        .eq("idempotency_key", idemKey);
    }

    console.log("[wa-inbound] processed OK");
    return json(200, { status: "processed" });
  } catch (err) {
    console.error("[wa-inbound] processing failed", err);
    // Forget the event: OpenWA retries after a 500, and with the key still
    // stored the retry would be dropped as a duplicate
    await supabase
      .from("wa_processed_events")
      .delete()
      .eq("idempotency_key", idemKey);
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
): Promise<Outcome> {
  const data = env.data as {
    from: string;
    body?: string;
    type?: string;
    isGroup?: boolean;
    fromMe?: boolean;
    senderPhone?: string | null;
  };

  console.log(
    `[wa-inbound] handleMessageReceived from=${data.from} type=${data.type} fromMe=${data.fromMe} isGroup=${data.isGroup} body="${(data.body ?? "").slice(0, 40)}"`
  );

  if (data.fromMe || data.isGroup) {
    console.log("[wa-inbound] skip: fromMe or isGroup");
    return { result: "skip: fromMe or group" };
  }

  // Ignorar notificaciones internas de WhatsApp (e2e_notification,
  // call_log, group_notification, etc.) — solo procesar mensajes de chat reales.
  // A voice note cannot be read: it goes on as an unintelligible reply, so
  // the customer is asked to answer in writing (the usual clarify, 1 per 12h)
  const isVoiceNote = data.type === "ptt" || data.type === "audio";
  // A photo or a file is usually the receipt of a deposit transfer (090); it
  // only counts when the appointment owes one, otherwise it is ignored as before
  const isReceipt = data.type === "image" || data.type === "document";
  if (isVoiceNote) {
    data.body = "[nota de voz]";
  } else if (isReceipt) {
    data.body = data.body?.trim() || "[comprobante]";
  } else if (data.type && data.type !== "chat") {
    console.log(`[wa-inbound] skip: type=${data.type} (no es chat)`);
    return { result: `skip: type=${data.type}` };
  }

  // Mensajes sin cuerpo (stickers vacíos, media sin caption, etc.) — ignorar.
  if (!data.body || !data.body.trim()) {
    console.log("[wa-inbound] skip: empty body");
    return { result: "skip: empty body" };
  }

  const intent = classifyReply(data.body);
  console.log(`[wa-inbound] classifyReply → ${intent ?? "null"}`);

  // Resolve the business by session_id. Several businesses share one line
  // during the pilot, so the reply belongs to the one that last wrote to this
  // sender (see resolveOrgBySender).
  const { data: sessionOrgs, error: settingsErr } = await supabase
    .from("business_settings")
    .select("organization_id")
    .eq("openwa_session_id", env.sessionId);

  if (settingsErr) {
    console.error(
      `[wa-inbound] business_settings lookup error for session=${env.sessionId}:`,
      settingsErr.message
    );
  }

  const candidates = ((sessionOrgs ?? []) as { organization_id: string }[]).map(
    (row) => row.organization_id
  );
  if (!candidates.length) {
    console.warn(
      `[wa-inbound] session not mapped to org: ${env.sessionId}`
    );
    return { result: "skip: session not mapped to any business" };
  }

  // Resolve the appointment of this chat: first the chat ids we write to for
  // this sender (see resolveChatIds), then the latest open message of an
  // appointment that is still ahead. The message_id of that message is not
  // required: OpenWA can answer with an error after delivering, leaving it null.
  const from = data.from ?? "";
  let organizationId = candidates[0];
  const { data: orgRows } = await supabase
    .from("organizations")
    .select("id, reply_prefix")
    .in("id", candidates);
  const prefixByOrg = new Map<string, string>(
    ((orgRows ?? []) as { id: string; reply_prefix: string | null }[])
      .filter((o) => o.reply_prefix)
      .map((o) => [o.id, o.reply_prefix as string])
  );
  const knownPrefixes = [...prefixByOrg.values()];
  const chatIds = await resolveChatIds(supabase, from);
  const isPrivacyId = from.endsWith("@lid");
  let aliasSource: string | null = null;
  // A privacy-id sender (@lid) whose alias was never learned: OpenWA can map
  // it to the phone, either inline (senderPhone, RESOLVE_LID_TO_PHONE=true on
  // the server) or on demand.
  let lidLookup = "";
  if (from.endsWith("@lid")) {
    const inline =
      typeof data.senderPhone === "string" ? data.senderPhone.replace(/\D/g, "") : "";
    let phone: string | null = inline || null;
    if (!phone && !chatIds.length) {
      const lookup = await resolveContactPhone(env.sessionId, from);
      phone = lookup.phone;
      lidLookup = lookup.error ? `lookup failed ${lookup.error}` : `lookup phone=${lookup.phone}`;
    }
    if (phone) {
      const chatId = `${phone}@c.us`;
      if (!chatIds.includes(chatId)) chatIds.push(chatId);
      aliasSource = "openwa_lookup";
      console.log(`[wa-inbound] ${from} resolved to ${chatId}`);
    }
  }
  // Still unknown: the reply itself can name the appointment ("OK T-0003"),
  // which identifies the chat we wrote to. Otherwise ask for the code.
  if (!chatIds.length) {
    const code = parseReplyCode(data.body ?? "", knownPrefixes);
    const byCode = code ? await chatByAppointmentCode(supabase, candidates, code) : null;
    if (byCode) {
      chatIds.push(byCode.chatId);
      organizationId = byCode.organizationId;
      aliasSource = "reply_code";
      console.log(`[wa-inbound] ${from} identified by code ${code} → ${byCode.chatId}`);
    } else {
      const example = await exampleCodeFor(supabase, candidates, prefixByOrg);
      const asked = await askForCode(supabase, env.sessionId, from, code, example);
      return {
        result: `unknown sender ${from} (${lidLookup || "no lookup"}; code=${code ?? "none"}; ${asked})`,
      };
    }
  }
  if (isPrivacyId && aliasSource && chatIds.length) {
    await supabase.from("wa_sender_aliases").upsert(
      {
        sender_id: from,
        chat_id: chatIds[0],
        source: aliasSource,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "sender_id" }
    );
  }
  if (candidates.length > 1) {
    const match = await resolveOrgBySender(supabase, candidates, chatIds);
    if (!match) {
      console.log(
        `[wa-inbound] ${candidates.length} orgs on session ${env.sessionId}, none wrote to "${from}"`
      );
      return {
        result: `skip: ${candidates.length} businesses on the line, none wrote to ${from} (chatIds=${chatIds.join(",") || "none"}; ${lidLookup || "no lookup"})`,
      };
    }
    organizationId = match;
  }

  console.log(
    `[wa-inbound] resolved org=${organizationId} for session=${env.sessionId}`
  );

  // A blocked business (expired license or deactivated) gets no replies processed
  const { data: usable } = await supabase.rpc("org_license_usable", {
    p_org_id: organizationId,
  });
  if (usable !== true) {
    return { organizationId, result: "skip: license_blocked" };
  }

  console.log(
    `[wa-inbound] resolving outbound for from="${from}" (chatIds=${chatIds.join(",") || "none"})`
  );

  // ¿Es una valoración (respuesta a rating_request)? "5", "4 muy bueno", etc.
  const ratingValue = parseRating(data.body);
  if (ratingValue !== null) {
    const ratingApplied = await tryApplyRating(
      supabase,
      organizationId,
      chatIds,
      ratingValue,
      data.body
    );
    if (ratingApplied) return { organizationId, result: "rating applied" };
    // Sin rating_request pendiente: cae al flujo normal (confirm/cancel/clarify)
  }

  // A reply to a trip message (seat booking) must never change an appointment
  const { data: latestAny } = chatIds.length
    ? await supabase
        .from("wa_outbound_messages")
        .select("trip_booking_id")
        .eq("organization_id", organizationId)
        .in("chat_id", chatIds)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ trip_booking_id: string | null }>()
    : { data: null };
  if (latestAny?.trip_booking_id) {
    console.log(
      `[wa-inbound] latest message to "${from}" was about a trip booking: appointments untouched`
    );
    return { organizationId, result: "skip: latest message to sender was a trip booking" };
  }

  const OPEN_INTENTS = [
    "confirm",
    "reminder_24h",
    "reminder_1h",
    "reminder_manual",
    "approved",
    "rescheduled",
  ];
  // A reply only applies to appointments that are still open and ahead
  const OPEN_STATUSES = ["pending", "confirmed", "reminded", "client_confirmed"];
  // One day of slack: appointment_date is in the business timezone
  const minDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: openOutbound } = chatIds.length
    ? await supabase
        .from("wa_outbound_messages")
        .select(
          "appointment_id, sent_at, chat_id, appointments!inner(status, appointment_date, appointment_number)"
        )
        .eq("organization_id", organizationId)
        .in("chat_id", chatIds)
        .in("intent", OPEN_INTENTS)
        .in("appointments.status", OPEN_STATUSES)
        .gte("appointments.appointment_date", minDate)
        .order("sent_at", { ascending: false })
        .limit(30)
    : { data: [] };

  const openRows = (openOutbound ?? []) as {
    appointment_id: string;
    sent_at: string;
    chat_id: string;
    appointments: { appointment_number: string | null };
  }[];
  const openIds = [...new Set(openRows.map((row) => row.appointment_id))];

  // The customer can name the appointment ("CANCELAR T-0045"); otherwise the
  // one that got the latest message.
  const named = appointmentNumberIn(data.body, knownPrefixes);
  const lastOutbound =
    (named &&
      openRows.find((row) => row.appointments?.appointment_number === named)) ||
    openRows[0];

  if (!lastOutbound?.appointment_id) {
    console.log(
      `[wa-inbound] no open appointment for from="${from}" in org ${organizationId}`
    );
    return {
      organizationId,
      result: `no open appointment for ${from} (chatIds=${chatIds.join(",") || "none"}; ${lidLookup || "no lookup"})`,
    };
  }

  console.log(
    `[wa-inbound] matched appointment=${lastOutbound.appointment_id} via chat_id=${lastOutbound.chat_id}`
  );

  const appointmentId = lastOutbound.appointment_id;

  // The customer says they paid the deposit: "PAGUÉ" or a photo of the receipt
  if (isReceipt || isPaymentNotice(data.body)) {
    const paid = await markDepositPaid(supabase, named ? [appointmentId] : openIds, appointmentId);
    if (paid) {
      await invokeWaSend(paid, "deposit_paid_ack");
      await invokeWaSend(paid, "notify_business_deposit_paid");
      return { organizationId, result: `deposit paid for ${paid}` };
    }
    if (isReceipt) {
      return { organizationId, result: `skip: media for ${appointmentId}, no deposit owed` };
    }
  }

  // Several open appointments and no number: cancelling the latest one may
  // cancel the wrong appointment. Ask which one instead.
  if (intent === "cancel" && openIds.length > 1 && !named) {
    console.log(
      `[wa-inbound] ambiguous CANCEL: ${openIds.length} open appointments for "${from}"`
    );
    await invokeWaSend(appointmentId, "clarify_which");
    return { organizationId, result: `ambiguous cancel for ${appointmentId}: asked which` };
  }

  // Si no se entendió → mandar mensaje de clarificación (con throttle)
  if (!intent) {
    console.log(
      `[wa-inbound] unclassified reply from ${data.from}: "${(data.body ?? "").slice(
        0,
        80
      )}"`
    );
    await maybeSendClarify(supabase, appointmentId);
    return {
      organizationId,
      result: `unclassified reply for ${appointmentId}: "${(data.body ?? "").slice(0, 40)}"`,
    };
  }

  if (intent === "confirm") {
    console.log(
      `[wa-inbound] applying CONFIRM to appointment ${appointmentId}`
    );
    // A pending appointment still needs the business approval: record the
    // customer's confirmation but keep the status (only the business approves).
    const { data: current } = await supabase
      .from("appointments")
      .select("status")
      .eq("id", appointmentId)
      .maybeSingle();
    const awaitingApproval = current?.status === "pending";

    const { error: updErr, count } = await supabase
      .from("appointments")
      .update(
        {
          client_confirmed_at: new Date().toISOString(),
          ...(awaitingApproval ? {} : { status: "client_confirmed" }),
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
    return {
      organizationId,
      result: `confirm applied to ${appointmentId}: ${updErr ? "UPDATE failed " + updErr.message : "rows=" + (count ?? "?")}`,
    };
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
    // status='cancelled' se commitea. Aquí solo notificamos al negocio.
    await invokeWaSend(appointmentId, "notify_business_cancel");
    return {
      organizationId,
      result: `cancel applied to ${appointmentId}: ${updErr ? "UPDATE failed " + updErr.message : "rows=" + (count ?? "?")}`,
    };
  }
  return { organizationId, result: `intent ${intent} not handled for ${appointmentId}` };
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

  // Every business on this line loses WhatsApp at once
  const { data: sessionOrgs } = await supabase
    .from("business_settings")
    .select("organization_id")
    .eq("openwa_session_id", env.sessionId);
  const organizationIds = ((sessionOrgs ?? []) as { organization_id: string }[]).map(
    (row) => row.organization_id
  );
  if (!organizationIds.length) return;

  // notifications.user_id is NOT NULL: one row per owner of each business
  const { data: owners } = await supabase
    .from("user_profiles")
    .select("user_id, organization_id")
    .in("organization_id", organizationIds)
    .eq("role", "owner");

  if (!owners?.length) return;

  await supabase.from("notifications").insert(
    owners.map((owner: { user_id: string; organization_id: string }) => ({
      organization_id: owner.organization_id,
      user_id: owner.user_id,
      type: "wa_session_down",
      title: "WhatsApp desconectado",
      message: `La sesión OpenWA ${env.sessionId} cambió a estado ${derived}. Vuelve a escanear el QR.`,
    }))
  );
}

/** Chat ids ("<digits>@c.us", as wa-send writes them) that belong to the
 *  sender. WhatsApp can deliver replies from an @lid alias instead of the
 *  phone number; the alias is learned from earlier message_ids, which OpenWA
 *  builds from the delivered chat ("true_<lid>@lid_<id>"). The lookup spans
 *  every business: the alias identifies the person, not the business.
 */
async function resolveChatIds(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  from: string
): Promise<string[]> {
  if (!from) return [];
  const chatIds = new Set<string>();

  // Aliases learned earlier (082): the fast, deterministic path
  const { data: known } = await supabase
    .from("wa_sender_aliases")
    .select("chat_id")
    .eq("sender_id", from)
    .maybeSingle<{ chat_id: string }>();
  if (known?.chat_id) chatIds.add(known.chat_id);

  const digits = from.replace(/[^0-9]/g, "");
  if (from.endsWith("@c.us") && digits.length >= 8) {
    const suffix = digits.slice(-Math.min(10, digits.length));
    const { data } = await supabase
      .from("wa_outbound_messages")
      .select("chat_id")
      .ilike("chat_id", `%${suffix}@c.us`)
      .limit(20);
    for (const row of data ?? []) chatIds.add(row.chat_id);
  }

  const { data: aliased } = await supabase
    .from("wa_outbound_messages")
    .select("chat_id")
    .ilike("message_id", `%_${from}_%`)
    .order("sent_at", { ascending: false })
    .limit(20);
  for (const row of aliased ?? []) chatIds.add(row.chat_id);

  return [...chatIds];
}

/** The chat we wrote to about appointment `code` (e.g. "T-0003"), when exactly
 *  one open appointment with that number got a customer message from one of
 *  the businesses on the line. */
async function chatByAppointmentCode(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationIds: string[],
  code: string
): Promise<{ chatId: string; organizationId: string } | null> {
  const minDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("wa_outbound_messages")
    .select("chat_id, organization_id, appointment_id, appointments!inner(appointment_number, status, appointment_date)")
    .in("organization_id", organizationIds)
    .eq("appointments.appointment_number", code)
    .in("appointments.status", ["pending", "confirmed", "reminded", "client_confirmed"])
    .gte("appointments.appointment_date", minDate)
    .like("chat_id", "%@c.us")
    .order("sent_at", { ascending: false })
    .limit(10);
  const rows = (data ?? []) as { chat_id: string; organization_id: string; appointment_id: string }[];
  const appointments = new Set(rows.map((r) => r.appointment_id));
  if (appointments.size !== 1) return null;
  return { chatId: rows[0].chat_id, organizationId: rows[0].organization_id };
}

/** Example code for the "include the code" note: the prefix of the business
 *  that last wrote to a customer on this line (most likely the one being
 *  answered), else any prefix on the line, else T-0001. */
async function exampleCodeFor(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationIds: string[],
  prefixByOrg: Map<string, string>
): Promise<string> {
  const { data: last } = await supabase
    .from("wa_outbound_messages")
    .select("organization_id")
    .in("organization_id", organizationIds)
    .in("intent", ["confirm", "reminder_24h", "reminder_1h", "reminder_manual", "approved", "rescheduled"])
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ organization_id: string }>();
  const prefix =
    (last?.organization_id && prefixByOrg.get(last.organization_id)) ||
    prefixByOrg.values().next().value;
  return `${prefix ?? "T"}-0001`;
}

const ASK_CODE_THROTTLE_MS = 12 * 60 * 60 * 1000;

/** Best effort: tell an unidentified sender to include the appointment code.
 *  At most once per sender every 12 h (looked up in wa_processed_events). */
async function askForCode(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  sessionId: string,
  from: string,
  code: string | null,
  example: string
): Promise<string> {
  const since = new Date(Date.now() - ASK_CODE_THROTTLE_MS).toISOString();
  const { data: recent } = await supabase
    .from("wa_processed_events")
    .select("idempotency_key")
    .eq("payload->>from", from)
    .gte("processed_at", since)
    .ilike("result", "%asked for code%")
    .limit(1);
  if (recent?.length) return "asked recently";

  const text = code
    ? `No encontramos un turno abierto con el código ${code}. Revisa el código que aparece en tu mensaje y responde, por ejemplo, *OK ${example}*.`
    : `No pudimos identificar tu turno. Responde con la palabra y el código que aparecen en tu mensaje, por ejemplo *OK ${example}* o *CANCELAR ${example}*.`;
  const sent = await sendText({ sessionId, chatId: from, text });
  const statusCode = (sent.error?.details as { statusCode?: number } | undefined)?.statusCode;
  const ok = sent.success || sent.error?.code === "HTTP_500" || statusCode === 500;
  return ok ? "asked for code" : `asked for code failed ${sent.error?.code ?? "?"}`;
}

/** Among the businesses that share a WhatsApp line, the one that last wrote
 *  to the sender (any of its chat ids). Null when none of them did.
 */
async function resolveOrgBySender(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationIds: string[],
  chatIds: string[]
): Promise<string | null> {
  if (!chatIds.length) return null;
  const { data: latest } = await supabase
    .from("wa_outbound_messages")
    .select("organization_id")
    .in("organization_id", organizationIds)
    .in("chat_id", chatIds)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ organization_id: string }>();
  return latest?.organization_id ?? null;
}

/** Extrae una valoración 1-5 si el mensaje empieza con ese número.
 *  "5" → 5; "4 muy bueno" → 4; "10" → null; "ok" → null.
 */
function parseRating(body: string): number | null {
  const firstToken = body.trim().split(/\s+/)[0] ?? "";
  if (!/^[1-5]$/.test(firstToken)) return null;
  return Number(firstToken);
}

/** Busca el último rating_request enviado a este chat (últimos 14 días) y,
 *  si el appointment aún no tiene rating, lo guarda junto con el texto extra
 *  como feedback. Devuelve true si la valoración fue aplicada.
 */
async function tryApplyRating(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  chatIds: string[],
  rating: number,
  rawBody: string
): Promise<boolean> {
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Same chat resolution as the confirm/cancel flow
  const { data: ratingOutbound } = chatIds.length
    ? await supabase
        .from("wa_outbound_messages")
        .select("appointment_id, sent_at")
        .eq("organization_id", organizationId)
        .eq("intent", "rating_request")
        .in("chat_id", chatIds)
        .not("appointment_id", "is", null)
        .gte("sent_at", fourteenDaysAgo)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ appointment_id: string; sent_at: string }>()
    : { data: null };

  if (!ratingOutbound?.appointment_id) {
    console.log(
      `[wa-inbound] rating ${rating} recibido pero sin rating_request pendiente para chatIds=${chatIds.join(",") || "none"}`
    );
    return false;
  }

  const appointmentId = ratingOutbound.appointment_id;

  // Solo aplicar si aún no tiene rating (la primera respuesta gana)
  const { data: appt } = await supabase
    .from("appointments")
    .select("rating")
    .eq("id", appointmentId)
    .single<{ rating: number | null }>();

  if (!appt || appt.rating !== null) {
    console.log(
      `[wa-inbound] appointment ${appointmentId} ya tiene rating, skip`
    );
    return true; // era una respuesta a rating, no seguir al flujo confirm/cancel
  }

  // Texto adicional después del número → feedback
  const feedback = rawBody.trim().replace(/^[1-5]\s*/, "").trim() || null;

  const { error: updErr } = await supabase
    .from("appointments")
    .update({ rating, feedback })
    .eq("id", appointmentId);

  if (updErr) {
    console.error(`[wa-inbound] rating UPDATE failed:`, updErr.message);
    return true;
  }

  console.log(
    `[wa-inbound] rating ${rating} aplicado a appointment ${appointmentId}`
  );
  await invokeWaSend(appointmentId, "rating_ack");
  return true;
}

/** Clasifica la respuesta de un cliente: confirmación, cancelación o ninguna.
 *  Tolerante a mayúsculas, acentos, puntuación y palabras adicionales:
 *  - "ok", "OK!", "Ok gracias"            → confirm
 *  - "Si dale", "Sí, voy", "CONFIRMO"     → confirm
 *  - "No puedo", "cancelar por favor"     → cancel
 *  - "Hola, queria preguntar..."          → null
 */
/**
 * "Ya pagué", "transferí", "pago hecho"… — the customer says the deposit is paid.
 * "No pagué todavía" is not.
 */
function isPaymentNotice(body: string): boolean {
  const normalized = body
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/\bNO (HE |LO )?(PAGUE|PAGADO|TRANSFERI)\b/.test(normalized)) return false;
  return /\b(PAGUE|PAGADO|PAGO HECHO|PAGO REALIZADO|LISTO EL PAGO|TRANSFERI|TRANSFERIDO|TRANSFERENCIA HECHA|DEPOSITE|ENVIE EL PAGO)\b/.test(
    normalized
  );
}

/**
 * Marks as paid the deposit the customer is talking about: among their open
 * appointments, the only one that owes a deposit, or else the latest one.
 * Returns the appointment, or null when none owes a deposit.
 */
async function markDepositPaid(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  candidateIds: string[],
  latestId: string
): Promise<string | null> {
  const { data: owing } = await supabase
    .from("appointments")
    .select("id")
    .in("id", candidateIds.length ? candidateIds : [latestId])
    .in("deposit_status", ["pending", "requested"]);
  const rows = (owing ?? []) as { id: string }[];
  const target =
    rows.length === 1
      ? rows[0].id
      : rows.some((row) => row.id === latestId)
        ? latestId
        : null;
  if (!target) return null;

  const { data: updated } = await supabase
    .from("appointments")
    .update({ deposit_status: "paid" })
    .eq("id", target)
    .in("deposit_status", ["pending", "requested"])
    .select("id");
  return updated?.length ? target : null;
}

function classifyReply(body: string): "confirm" | "cancel" | null {
  // A thumbs-up on its own (any skin tone) is a yes
  if (
    /^(?:\s|👍|👌|✅|[\u{1F3FB}-\u{1F3FF}]|️)+$/u.test(body) &&
    /👍|👌|✅/u.test(body)
  ) {
    return "confirm";
  }

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
    "CANCELAR",
    "CANCELO",
    "CANCELADO",
    "CANCEL",
    "ANULAR",
    "ANULO",
  ]);
  // Words that only cancel on their own: "No hay problema, allí estaré" or
  // "NO" inside a longer sentence must not cancel an appointment.
  const CANCEL_ALONE = new Set(["NO"]);

  // Match exacto sobre el mensaje completo
  if (CONFIRM.has(normalized)) return "confirm";
  if (CANCEL.has(normalized) || CANCEL_ALONE.has(normalized)) return "cancel";

  // Match sobre la primera palabra (captura "OK gracias", "Cancelar por favor",
  // "Cancelar T-0045"), salvo que lo que sigue lo niegue ("Si no puedo ir")
  const [firstWord, ...rest] = normalized.split(" ");
  if (CONFIRM.has(firstWord)) return rest.includes("NO") ? null : "confirm";
  if (CANCEL.has(firstWord)) return "cancel";
  // "No puedo ir, cancelo": an explicit cancel word anywhere, unless negated
  // right before it ("no quiero cancelar", "no cancelen")
  const words = [firstWord, ...rest];
  const cancelAt = words.findIndex((word) => CANCEL.has(word));
  const negated =
    words[cancelAt - 1] === "NO" ||
    (words[cancelAt - 2] === "NO" && words[cancelAt - 1] === "QUIERO");
  if (cancelAt > 0 && !negated) {
    return "cancel";
  }

  // Anything else (including "Reagendar") gets the clarification message
  return null;
}

/** "T-0045", "t45" or "T 0045" in the reply → "T-0045", else null. */
/** The appointment code in a reply, typed loosely: "T-0045", "ES-0001",
 *  "es-001", "es001", "es 1" → "ES-0001", the appointment_number itself (084).
 *  Letters other than T must be a known business prefix, so "dale 5" or
 *  "voy 2" are not read as codes. */
function parseReplyCode(body: string, knownPrefixes: string[]): string | null {
  const known = new Set(knownPrefixes.map((p) => p.toUpperCase()));
  const re = /\b([A-Z]{1,4})[-\s]?0*(\d{1,6})\b/gi;
  for (const match of body.matchAll(re)) {
    const letters = match[1].toUpperCase();
    if (letters === "T" || known.has(letters)) {
      return `${letters}-${match[2].padStart(4, "0")}`;
    }
  }
  return null;
}

function appointmentNumberIn(body: string, knownPrefixes: string[] = []): string | null {
  return parseReplyCode(body, knownPrefixes);
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
