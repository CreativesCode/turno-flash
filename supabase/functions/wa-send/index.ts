// Edge Function: wa-send
//
// Envía un mensaje WhatsApp vía OpenWA para un appointment dado.
// Invocada por:
//   - Trigger DB en INSERT de appointments (caso 1: confirmación)
//   - Trigger DB / send-reminders (caso 2: recordatorios)
//   - wa-inbound al recibir respuestas del cliente (caso 4: notif al negocio)
//
// Request body:
//   { appointmentId: string, intent: "confirm" | "reminder_24h" | "reminder_1h"
//     | "notify_business_new" | "notify_business_cancel" | "notify_business_confirm"
//     | "cancel_ack" | "confirm_ack" | "rating_request" | "rating_ack"
//     | "waitlist_slot" | "approved" | "rescheduled", waitlistId?: string }
//
//   approved: el negocio aprobó un turno pending (trigger en UPDATE de status).
//   rescheduled: el negocio movió el turno de fecha u hora (migración 062);
//     se pide confirmar de nuevo.
//
//   waitlistId es obligatorio para intent=waitlist_slot: el mensaje describe el
//   hueco liberado (datos del appointment cancelado) pero va al cliente de la
//   entrada de waitlist, no al del appointment.
//
//   Payment notices (096), all behind business_settings.enable_payment_reminders:
//   deposit_due_reminder / deposit_overdue / notify_business_deposit_overdue
//   (send-reminders) and payment_received (trigger on appointment_payments,
//   paymentId required).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  phoneToChatId,
  sendText,
  type OpenWaResponse,
  type SendTextData,
} from "../_shared/openwa.ts";
import { isServiceRole } from "../_shared/auth.ts";
import {
  type FrameOptions,
  frameCustomerMessage,
  money,
} from "../_shared/wa-message.ts";

// Which customer messages carry the business contact ("¿Dudas? Escribe a…").
// Only where the customer is likely to need a person: the first message (so
// they learn the right number from the start), when we did not understand
// them, after a cancellation (to get another time) and for a freed slot.
// Reminders, thanks and ratings stay short. notify_business_* are not framed.
const CUSTOMER_FRAME: Partial<Record<Intent, FrameOptions>> = {
  confirm: { contact: true, reply: "keywords" },
  approved: { contact: false, reply: "keywords" },
  rescheduled: { contact: true, reply: "keywords" },
  reminder_24h: { contact: false, reply: "keywords" },
  reminder_1h: { contact: false, reply: "keywords" },
  reminder_manual: { contact: false, reply: "keywords" },
  clarify: { contact: true, reply: "keywords" },
  clarify_which: { contact: true, reply: "keywords" },
  cancel_ack: { contact: true, reply: "none" },
  confirm_ack: { contact: false, reply: "none" },
  rating_request: { contact: false, reply: "rating" },
  rating_ack: { contact: false, reply: "none" },
  waitlist_slot: { contact: true, reply: "none" },
  deposit_paid_ack: { contact: false, reply: "none" },
  deposit_due_reminder: { contact: false, reply: "deposit" },
  deposit_overdue: { contact: true, reply: "deposit" },
  payment_received: { contact: false, reply: "none" },
};

const PAYMENT_NOTICES: Intent[] = [
  "deposit_due_reminder",
  "deposit_overdue",
  "notify_business_deposit_overdue",
  "payment_received",
];

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "efectivo",
  transfer: "transferencia",
  card: "tarjeta",
};

type Intent =
  | "confirm"
  | "reminder_24h"
  | "reminder_1h"
  | "reminder_manual"
  | "clarify"
  | "clarify_which"
  | "notify_business_new"
  | "notify_business_cancel"
  | "notify_business_confirm"
  | "cancel_ack"
  | "confirm_ack"
  | "rating_request"
  | "rating_ack"
  | "waitlist_slot"
  | "approved"
  | "rescheduled"
  | "deposit_paid_ack"
  | "notify_business_deposit_paid"
  | "deposit_due_reminder"
  | "deposit_overdue"
  | "notify_business_deposit_overdue"
  | "payment_received";

/** The payment a payment_received receipt is about, with the appointment totals. */
interface PaymentInfo {
  amount: string;
  method: string;
  paid: string;
  pending: string;
}

/** The deposit the appointment still waits for (090), with how to pay it. */
interface DepositInfo {
  amount: string;
  instructions: string | null;
  /** "22 de octubre, 10:00" in the business time zone; null = no deadline (093). */
  dueAt: string | null;
}

interface AppointmentRow {
  id: string;
  organization_id: string;
  customer_id: string;
  appointment_number: string | null;
  appointment_date: string;
  start_time: string;
  status: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  service_name: string;
  staff_first_name: string | null;
  organization_name: string;
  organization_timezone: string;
  deposit_amount: number | null;
  deposit_status: string | null;
  deposit_due_at: string | null;
  payment_terms: string | null;
  timezone: string | null;
  amount_paid: number;
  amount_pending: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { appointmentId, intent, waitlistId, paymentId } = (await req.json()) as {
      appointmentId: string;
      intent: Intent;
      waitlistId?: string;
      paymentId?: string;
    };

    if (!appointmentId || !intent) {
      return json(400, {
        success: false,
        error: "appointmentId and intent are required",
      });
    }

    if (intent === "waitlist_slot" && !waitlistId) {
      return json(400, {
        success: false,
        error: "waitlistId is required for intent=waitlist_slot",
      });
    }

    if (intent === "payment_received" && !paymentId) {
      return json(400, {
        success: false,
        error: "paymentId is required for intent=payment_received",
      });
    }

    // Triggers and crons call with the service role. From the dashboard only the
    // manual reminder is allowed, and only for an appointment the user can see.
    if (!isServiceRole(req)) {
      const allowed =
        intent === "reminder_manual" &&
        (await userCanSeeAppointment(req, appointmentId));
      if (!allowed) {
        return json(403, { success: false, error: "No autorizado" });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Cargar appointment + datos relacionados desde la vista
    const { data: appt, error: apptErr } = await supabase
      .from("appointments_with_details")
      .select("*")
      .eq("id", appointmentId)
      .single<AppointmentRow>();

    if (apptErr || !appt) {
      return json(404, {
        success: false,
        error: `Appointment not found: ${apptErr?.message ?? "unknown"}`,
      });
    }

    // A blocked business (expired license or deactivated) sends nothing
    const { data: usable } = await supabase.rpc("org_license_usable", {
      p_org_id: appt.organization_id,
    });
    if (usable !== true) {
      return json(200, {
        success: false,
        skipped: true,
        reason: "license_blocked",
      });
    }

    // 2. Cargar configuración WA del negocio
    const { data: settings, error: settingsErr } = await supabase
      .from("business_settings")
      .select(
        "openwa_session_id, whatsapp_integration_enabled, deposit_instructions, enable_payment_reminders"
      )
      .eq("organization_id", appt.organization_id)
      .single<{
        openwa_session_id: string | null;
        whatsapp_integration_enabled: boolean;
        deposit_instructions: string | null;
        enable_payment_reminders: boolean;
      }>();

    if (settingsErr || !settings?.whatsapp_integration_enabled) {
      return json(200, {
        success: false,
        skipped: true,
        reason: "WhatsApp not enabled for this organization",
      });
    }

    if (!settings.openwa_session_id) {
      return json(200, {
        success: false,
        skipped: true,
        reason: "openwa_session_id missing in business_settings",
      });
    }

    if (PAYMENT_NOTICES.includes(intent) && !settings.enable_payment_reminders) {
      return json(200, {
        success: false,
        skipped: true,
        reason: "Payment reminders disabled for this organization",
      });
    }

    // 3a. Payment notices: once per deadline (096) and once per payment
    const skipReason = await paymentNoticeSkipReason(supabase, appt, intent, paymentId);
    if (skipReason) {
      return json(200, { success: true, skipped: true, reason: skipReason });
    }

    // 3. Idempotencia: ¿ya mandamos este intent para este appointment?
    //    `reminder_manual` queda fuera: el operador puede querer reenviar.
    //    `rescheduled` también: cada cambio de horario se avisa.
    if (
      intent === "confirm" ||
      intent === "reminder_24h" ||
      intent === "reminder_1h" ||
      intent === "rating_request" ||
      intent === "approved"
    ) {
      // A reminder sent for the old time doesn't count after a reschedule
      const { data: moved } = await supabase
        .from("appointments")
        .select("rescheduled_at")
        .eq("id", appointmentId)
        .single<{ rescheduled_at: string | null }>();

      let existingQuery = supabase
        .from("wa_outbound_messages")
        .select("id")
        .eq("appointment_id", appointmentId)
        .eq("intent", intent)
        // "failed" too: OpenWA can answer HTTP 500 after delivering
        .in("status", ["pending", "sent", "delivered", "read", "failed"]);
      if (moved?.rescheduled_at) {
        existingQuery = existingQuery.gte("sent_at", moved.rescheduled_at);
      }
      const { data: existing } = await existingQuery.limit(1).maybeSingle();

      if (existing) {
        return json(200, {
          success: true,
          skipped: true,
          reason: `Already sent (intent=${intent})`,
        });
      }
    }

    // 3b. waitlist_slot: idempotencia por entrada de waitlist (notified_at)
    let waitlistCustomerName = "";
    if (intent === "waitlist_slot") {
      const { data: wl } = await supabase
        .from("waitlist")
        .select("id, status, notified_at, customer_id")
        .eq("id", waitlistId!)
        .single<{
          id: string;
          status: string;
          notified_at: string | null;
          customer_id: string;
        }>();

      if (!wl) {
        return json(404, { success: false, error: "Waitlist entry not found" });
      }
      if (wl.notified_at || wl.status !== "active") {
        return json(200, {
          success: true,
          skipped: true,
          reason: `Waitlist entry already ${wl.status}`,
        });
      }

      const { data: wlCustomer } = await supabase
        .from("customers")
        .select("first_name")
        .eq("id", wl.customer_id)
        .single<{ first_name: string }>();
      waitlistCustomerName = wlCustomer?.first_name ?? "";
    }

    // 4. Determinar destinatario y mensaje según intent
    const target = await resolveTarget(
      supabase,
      appt,
      intent,
      settings.openwa_session_id,
      waitlistId
    );

    if (!target) {
      return json(200, {
        success: false,
        skipped: true,
        reason: "No target phone for this intent",
      });
    }

    const openList =
      intent === "clarify_which"
        ? await openAppointmentsList(supabase, appt.customer_id, appt.organization_id)
        : "";
    // The deposit still owed is part of the booking message (090)
    const depositOwed =
      appt.deposit_amount != null &&
      (appt.deposit_status === "pending" || appt.deposit_status === "requested");
    let deposit: DepositInfo | null = null;
    let payment: PaymentInfo | null = null;
    let currency = "USD";
    if (depositOwed || intent === "payment_received") {
      const { data: orgCurrency } = await supabase
        .from("organizations")
        .select("currency")
        .eq("id", appt.organization_id)
        .single<{ currency: string | null }>();
      currency = orgCurrency?.currency ?? "USD";
    }
    if (intent === "payment_received") {
      const { data: pay } = await supabase
        .from("appointment_payments")
        .select("amount, method, method_other")
        .eq("id", paymentId!)
        .single<{ amount: number; method: string; method_other: string | null }>();
      payment = {
        amount: money(Number(pay?.amount ?? 0), currency),
        method: pay?.method_other?.trim() || PAYMENT_METHOD_LABEL[pay?.method ?? ""] || "",
        paid: money(Number(appt.amount_paid ?? 0), currency),
        pending: money(Number(appt.amount_pending ?? 0), currency),
      };
    }
    if (depositOwed) {
      deposit = {
        amount: money(Number(appt.deposit_amount), currency),
        instructions: settings.deposit_instructions?.trim() || null,
        dueAt: appt.deposit_due_at
          ? new Date(appt.deposit_due_at).toLocaleString("es", {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: appt.timezone || appt.organization_timezone || "America/Havana",
            })
          : null,
      };
    }
    const body = buildMessage(appt, intent, waitlistCustomerName, openList, deposit, payment);
    const frame: FrameOptions | undefined =
      intent === "confirm" && deposit
        ? { contact: true, reply: "deposit" }
        : CUSTOMER_FRAME[intent];
    let text = body;
    if (frame) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name, contact_name, whatsapp_phone")
        .eq("id", appt.organization_id)
        .single<{ name: string; contact_name: string | null; whatsapp_phone: string | null }>();
      text = frameCustomerMessage(
        {
          name: org?.name ?? appt.organization_name,
          contactName: org?.contact_name ?? null,
          phone: org?.whatsapp_phone ?? null,
        },
        body,
        frame,
        appt.appointment_number ?? null
      );
    }

    // 5. Enviar
    console.log("[wa-send] sending", {
      sessionId: settings.openwa_session_id,
      chatId: target.chatId,
      intent,
      textLength: text.length,
    });

    const result: OpenWaResponse<SendTextData> = await sendText({
      sessionId: settings.openwa_session_id,
      chatId: target.chatId,
      text,
    });

    console.log(
      "[wa-send] OpenWA raw response",
      JSON.stringify(result, null, 2)
    );

    // 6. Persistir resultado
    if (result.success && result.data) {
      await supabase.from("wa_outbound_messages").insert({
        organization_id: appt.organization_id,
        appointment_id: appointmentId,
        intent,
        chat_id: target.chatId,
        message_id: result.data.messageId,
        status: "sent",
        body: text,
      });

      if (intent === "payment_received") await markReceiptSent(supabase, paymentId!);

      // Marcar la entrada de waitlist como notificada
      if (intent === "waitlist_slot" && waitlistId) {
        await supabase
          .from("waitlist")
          .update({ status: "notified", notified_at: new Date().toISOString() })
          .eq("id", waitlistId);
      }

      // Actualizar columnas del appointment para casos al cliente
      if (intent === "confirm") {
        await supabase
          .from("appointments")
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq("id", appointmentId);
        // The customer now has the amount and how to pay it
        if (deposit) {
          await supabase
            .from("appointments")
            .update({ deposit_status: "requested" })
            .eq("id", appointmentId)
            .eq("deposit_status", "pending");
        }
      } else if (
        intent === "reminder_24h" ||
        intent === "reminder_1h" ||
        intent === "reminder_manual"
      ) {
        await supabase
          .from("appointments")
          .update({
            reminder_sent_at: new Date().toISOString(),
            reminder_method: "whatsapp",
          })
          .eq("id", appointmentId);
        // Only a confirmed appointment moves to "reminded": a pending request
        // must keep its "Aprobar" button.
        await supabase
          .from("appointments")
          .update({ status: "reminded" })
          .eq("id", appointmentId)
          .eq("status", "confirmed");

        await supabase.from("reminder_logs").insert({
          appointment_id: appointmentId,
          reminder_type: intent,
          method: "whatsapp",
          message_content: text,
          status: "sent",
        });
      }

      return json(200, {
        success: true,
        messageId: result.data.messageId,
        intent,
      });
    }

    const errorCode = result.error?.code ?? "UNKNOWN";
    const errorMessage =
      result.error?.message ??
      `OpenWA respondió sin error explícito. Respuesta completa: ${JSON.stringify(result)}`;

    await supabase.from("wa_outbound_messages").insert({
      organization_id: appt.organization_id,
      appointment_id: appointmentId,
      intent,
      chat_id: target.chatId,
      status: "failed",
      body: text,
      error_code: errorCode,
      error_message: errorMessage,
    });
    // OpenWA can answer HTTP 500 after delivering: never send a receipt twice
    if (intent === "payment_received") await markReceiptSent(supabase, paymentId!);

    return json(502, {
      success: false,
      error: errorMessage,
      code: errorCode,
      raw: result,
    });
  } catch (err) {
    console.error("[wa-send] fatal", err);
    return json(500, {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─────────────────────────────────────────────────────────────

async function resolveTarget(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  appt: AppointmentRow,
  intent: Intent,
  _sessionId: string,
  waitlistId?: string
): Promise<{ chatId: string } | null> {
  // Notificaciones al negocio → al número del negocio
  if (intent.startsWith("notify_business")) {
    const { data: org } = await supabase
      .from("organizations")
      .select("whatsapp_phone")
      .eq("id", appt.organization_id)
      .single<{ whatsapp_phone: string | null }>();

    if (!org?.whatsapp_phone) return null;
    return { chatId: phoneToChatId(org.whatsapp_phone) };
  }

  // waitlist_slot → al cliente de la entrada de waitlist (no al del turno)
  if (intent === "waitlist_slot") {
    if (!waitlistId) return null;
    const { data: wl } = await supabase
      .from("waitlist")
      .select("customer_id")
      .eq("id", waitlistId)
      .single<{ customer_id: string }>();
    if (!wl) return null;

    const { data: wlCustomer } = await supabase
      .from("customers")
      .select("phone, phone_country_code, whatsapp_number")
      .eq("id", wl.customer_id)
      .single<{
        phone: string;
        phone_country_code: string | null;
        whatsapp_number: string | null;
      }>();
    if (!wlCustomer) return null;

    const wlPhone = wlCustomer.whatsapp_number || wlCustomer.phone;
    return {
      chatId: phoneToChatId(wlPhone, wlCustomer.phone_country_code ?? ""),
    };
  }

  // Resto → al cliente
  const { data: customer } = await supabase
    .from("customers")
    .select("phone, phone_country_code, whatsapp_number")
    .eq("id", await getCustomerId(supabase, appt.id))
    .single<{
      phone: string;
      phone_country_code: string | null;
      whatsapp_number: string | null;
    }>();

  if (!customer) return null;
  const phone = customer.whatsapp_number || customer.phone;
  return { chatId: phoneToChatId(phone, customer.phone_country_code ?? "") };
}

// deno-lint-ignore no-explicit-any
async function getCustomerId(supabase: any, appointmentId: string) {
  const { data } = await supabase
    .from("appointments")
    .select("customer_id")
    .eq("id", appointmentId)
    .single<{ customer_id: string }>();
  return data?.customer_id;
}

/**
 * Why a payment notice must not go out (096), or null to send it. Deposit
 * notices go once per deadline: a message sent before the current deadline
 * window does not count, so a moved deadline gets new ones. A receipt goes
 * once per payment, and never for a voided one.
 */
async function paymentNoticeSkipReason(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  appt: AppointmentRow,
  intent: Intent,
  paymentId?: string
): Promise<string | null> {
  if (intent === "payment_received") {
    const { data: pay } = await supabase
      .from("appointment_payments")
      .select("voided_at, ack_sent_at")
      .eq("id", paymentId)
      .maybeSingle<{ voided_at: string | null; ack_sent_at: string | null }>();
    if (!pay) return "Payment not found";
    if (pay.voided_at) return "Payment voided";
    return pay.ack_sent_at ? "Receipt already sent" : null;
  }

  const isReminder = intent === "deposit_due_reminder";
  if (!isReminder && intent !== "deposit_overdue" && intent !== "notify_business_deposit_overdue") {
    return null;
  }
  const owed = appt.deposit_status === "pending" || appt.deposit_status === "requested";
  if (!owed || !appt.deposit_due_at) return "Deposit not owed";
  const due = new Date(appt.deposit_due_at).getTime();
  if (isReminder ? Date.now() >= due : Date.now() < due) {
    return isReminder ? "Deadline already passed" : "Deadline not passed yet";
  }
  const since = new Date(isReminder ? due - 24 * 60 * 60 * 1000 : due).toISOString();
  const { data: existing } = await supabase
    .from("wa_outbound_messages")
    .select("id")
    .eq("appointment_id", appt.id)
    .eq("intent", intent)
    .gte("sent_at", since)
    .limit(1)
    .maybeSingle();
  return existing ? `Already sent for this deadline (intent=${intent})` : null;
}

// deno-lint-ignore no-explicit-any
async function markReceiptSent(supabase: any, paymentId: string) {
  await supabase
    .from("appointment_payments")
    .update({ ack_sent_at: new Date().toISOString() })
    .eq("id", paymentId);
}

/** "• T-0045 · martes 8 de octubre, 10:00" lines of the customer's open appointments. */
async function openAppointmentsList(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  customerId: string,
  organizationId: string
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("appointments")
    .select("appointment_number, appointment_date, start_time")
    .eq("customer_id", customerId)
    .eq("organization_id", organizationId)
    .in("status", ["pending", "confirmed", "reminded", "client_confirmed"])
    .gte("appointment_date", today)
    .order("appointment_date")
    .order("start_time");
  return ((data ?? []) as {
    appointment_number: string | null;
    appointment_date: string;
    start_time: string;
  }[])
    .map((row) => {
      const day = new Date(`${row.appointment_date}T00:00:00`).toLocaleDateString("es", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      return `• *${row.appointment_number}* · ${day}, ${row.start_time.slice(0, 5)}`;
    })
    .join("\n");
}

function buildMessage(
  appt: AppointmentRow,
  intent: Intent,
  waitlistCustomerName = "",
  openList = "",
  deposit: DepositInfo | null = null,
  payment: PaymentInfo | null = null
): string {
  const date = new Date(`${appt.appointment_date}T${appt.start_time}`);
  const fechaLarga = date.toLocaleDateString("es-CU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hora = appt.start_time.slice(0, 5);
  // "ES-0004": the same code the panel shows and the customer types back (084)
  const numero = appt.appointment_number ?? appt.id.slice(0, 8);
  const cliente = appt.customer_first_name;
  const servicio = appt.service_name;
  const staff = appt.staff_first_name
    ? `\n👤 *Con:* ${appt.staff_first_name}`
    : "";

  switch (intent) {
    case "confirm":
      // A service with a deposit: the time is held until the business gets it
      if (appt.status === "pending" && deposit) {
        return [
          `Hola ${cliente}! 👋`,
          ``,
          `Recibimos tu reserva:`,
          ``,
          `📅 ${fechaLarga}`,
          `⏰ ${hora}`,
          `💇 ${servicio}${staff}`,
          `🎫 N° ${numero}`,
          ``,
          deposit.dueAt
            ? `💵 Para confirmarla falta el anticipo de *${deposit.amount}*, antes del *${deposit.dueAt}*.`
            : `💵 Para confirmarla falta el anticipo de *${deposit.amount}*.`,
          ...(deposit.instructions ? [deposit.instructions] : []),
          ...(appt.payment_terms ? [``, `📋 *Condiciones:* ${appt.payment_terms}`] : []),
          ``,
          `Cuando pagues, responde *PAGUÉ ${numero}* o manda la foto del comprobante.`,
          `❌ Si ya no puedes ir, responde *CANCELAR ${numero}*.`,
        ].join("\n");
      }
      // Web bookings of services that need approval: it is a request, not a
      // booked time yet, so the customer is not asked to confirm with OK.
      if (appt.status === "pending") {
        return [
          `Hola ${cliente}! 👋`,
          ``,
          `Recibimos tu solicitud de turno:`,
          ``,
          `📅 ${fechaLarga}`,
          `⏰ ${hora}`,
          `💇 ${servicio}${staff}`,
          `🎫 N° ${numero}`,
          ``,
          `El negocio revisará tu solicitud y te avisaremos por aquí cuando la confirme.`,
          `❌ Si ya no puedes ir, responde *CANCELAR ${numero}*.`,
        ].join("\n");
      }
      return [
        `Hola ${cliente}! 👋`,
        ``,
        `Tu turno está reservado:`,
        ``,
        `📅 ${fechaLarga}`,
        `⏰ ${hora}`,
        `💇 ${servicio}${staff}`,
        `🎫 N° ${numero}`,
        ``,
        `Por favor confirma:`,
        `✅ *OK ${numero}* — confirmo que asisto`,
        `❌ *CANCELAR ${numero}* — no podré ir`,
      ].join("\n");

    case "approved":
      return [
        appt.deposit_status === "verified"
          ? `✅ Hola ${cliente}! Recibimos tu anticipo. Tu turno está confirmado:`
          : `✅ Hola ${cliente}! Aprobamos tu solicitud. Tu turno está confirmado:`,
        ``,
        `📅 ${fechaLarga}`,
        `⏰ ${hora}`,
        `💇 ${servicio}${staff}`,
        `🎫 N° ${numero}`,
        ``,
        `Te esperamos 🙌`,
        `❌ Si ya no puedes ir, responde *CANCELAR ${numero}*.`,
      ].join("\n");

    case "rescheduled":
      if (appt.status === "pending") {
        return [
          `🔄 Hola ${cliente}! Cambiamos el horario de tu solicitud de turno:`,
          ``,
          `📅 ${fechaLarga}`,
          `⏰ ${hora}`,
          `💇 ${servicio}${staff}`,
          `🎫 N° ${numero}`,
          ``,
          `El negocio revisará tu solicitud y te avisaremos por aquí cuando la confirme.`,
          `❌ Si este horario no te sirve, responde *CANCELAR ${numero}*.`,
        ].join("\n");
      }
      return [
        `🔄 Hola ${cliente}! Tu turno cambió de horario:`,
        ``,
        `📅 ${fechaLarga}`,
        `⏰ ${hora}`,
        `💇 ${servicio}${staff}`,
        `🎫 N° ${numero}`,
        ``,
        `Por favor confirma de nuevo:`,
        `✅ *OK ${numero}* — confirmo que asisto`,
        `❌ *CANCELAR ${numero}* — no podré ir`,
      ].join("\n");

    case "reminder_24h":
      return [
        `🔔 *Recordatorio* — Hola ${cliente}!`,
        ``,
        `Mañana ${fechaLarga} a las ${hora} te esperamos.`,
        ``,
        `💇 ${servicio}${staff}`,
        ``,
        `Escribe *OK ${numero}* para confirmar o *CANCELAR ${numero}* si no puedes.`,
      ].join("\n");

    case "reminder_1h":
      return [
        `⏰ Tu turno es en 1 hora (${hora}).`,
        ``,
        `💇 ${servicio}${staff}`,
        ``,
        `¡Te esperamos!`,
      ].join("\n");

    case "reminder_manual": {
      // Mensaje date-aware: usa "hoy"/"mañana"/fecha completa según corresponda
      const now = new Date();
      const apptDay = new Date(appt.appointment_date + "T00:00:00");
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const daysDiff = Math.round(
        (apptDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const whenLabel =
        daysDiff === 0
          ? `hoy a las ${hora}`
          : daysDiff === 1
            ? `mañana a las ${hora}`
            : `el ${fechaLarga} a las ${hora}`;

      return [
        `🔔 Hola ${cliente}!`,
        ``,
        `Te recordamos tu turno ${whenLabel}.`,
        ``,
        `💇 ${servicio}${staff}`,
        `🎫 N° ${numero}`,
        ``,
        `Escribe *OK ${numero}* para confirmar o *CANCELAR ${numero}* si no puedes.`,
      ].join("\n");
    }

    case "clarify":
      return [
        `🤔 No entendí tu respuesta.`,
        ``,
        `Para tu turno del *${fechaLarga}* a las *${hora}* (N° ${numero}):`,
        ``,
        `✅ Escribe *OK ${numero}* si vas a asistir`,
        `❌ Escribe *CANCELAR ${numero}* si no puedes ir`,
      ].join("\n");

    case "clarify_which":
      return [
        `Tienes varios turnos con nosotros:`,
        openList,
        ``,
        `Para cancelar uno, escribe *CANCELAR ${numero}* y su número, por ejemplo: *CANCELAR ${numero}*`,
      ].join("\n");

    case "cancel_ack":
      return `Tu turno N° ${numero} fue cancelado. Si quieres otro día u hora, avísale al negocio 🙌`;

    case "confirm_ack":
      if (appt.status === "pending") {
        return `¡Gracias ${cliente}! Anotamos que asistirás el ${fechaLarga} a las ${hora}. El negocio todavía tiene que aprobar tu solicitud.`;
      }
      return `¡Gracias ${cliente}! Confirmamos tu turno del ${fechaLarga} a las ${hora}. Te esperamos 🙌`;

    case "rating_request":
      return [
        `Hola ${cliente}! Gracias por visitarnos 🙌`,
        ``,
        `¿Cómo calificarías tu experiencia con *${servicio}*?`,
        ``,
        `Responde con un número del *1* al *5*:`,
        `5 ⭐⭐⭐⭐⭐ Excelente`,
        `1 ⭐ Muy mala`,
        ``,
        `Tu opinión nos ayuda a mejorar 💚`,
      ].join("\n");

    case "rating_ack":
      return `¡Gracias por tu valoración, ${cliente}! 💚 Te esperamos pronto.`;

    case "waitlist_slot": {
      const hola = waitlistCustomerName ? `Hola ${waitlistCustomerName}! ` : "";
      return [
        `${hola}📣 *Se liberó un lugar*`,
        ``,
        `💇 ${servicio}`,
        `📅 ${fechaLarga}`,
        `⏰ ${hora}`,
        ``,
        `Estabas en la lista de espera para este servicio. Si te interesa, avísale al negocio cuanto antes: el lugar se asigna por orden de llegada.`,
      ].join("\n");
    }

    case "notify_business_new":
      return [
        `📥 *Nuevo turno*`,
        ``,
        `Cliente: ${appt.customer_first_name} ${appt.customer_last_name}`,
        `Tel: ${appt.customer_phone}`,
        `Servicio: ${servicio}`,
        `📅 ${fechaLarga} ⏰ ${hora}`,
        `N° ${numero}`,
      ].join("\n");

    case "notify_business_cancel":
      return [
        `❌ *Turno cancelado por el cliente*`,
        ``,
        `${appt.customer_first_name} ${appt.customer_last_name}`,
        `📅 ${fechaLarga} ⏰ ${hora}`,
        `N° ${numero}`,
      ].join("\n");

    case "deposit_paid_ack":
      return `¡Gracias ${cliente}! Le avisamos al negocio que pagaste el anticipo del turno N° ${numero}. Te confirmamos por aquí cuando lo reciba.`;

    case "notify_business_deposit_paid":
      return [
        `💵 *El cliente dice que pagó el anticipo*`,
        ``,
        `${appt.customer_first_name} ${appt.customer_last_name}`,
        `📅 ${fechaLarga} ⏰ ${hora}`,
        `N° ${numero}`,
        ``,
        `Revisa que te llegó y márcalo como recibido en el turno para confirmarlo.`,
      ].join("\n");

    case "deposit_due_reminder":
      return [
        `🔔 Hola ${cliente}! Te recordamos el anticipo de tu turno:`,
        ``,
        `📅 ${fechaLarga}`,
        `⏰ ${hora}`,
        `💇 ${servicio}${staff}`,
        `🎫 N° ${numero}`,
        ``,
        deposit?.dueAt
          ? `💵 Falta el anticipo de *${deposit.amount}*, antes del *${deposit.dueAt}*.`
          : `💵 Falta el anticipo de *${deposit?.amount}*.`,
        ...(deposit?.instructions ? [deposit.instructions] : []),
        ...(appt.payment_terms ? [``, `📋 *Condiciones:* ${appt.payment_terms}`] : []),
        ``,
        `Cuando pagues, responde *PAGUÉ ${numero}* o manda la foto del comprobante.`,
        `❌ Si ya no puedes ir, responde *CANCELAR ${numero}*.`,
      ].join("\n");

    case "deposit_overdue":
      return [
        `⏰ Hola ${cliente}, venció el plazo para pagar el anticipo de *${deposit?.amount}* de tu turno N° ${numero} (${fechaLarga}, ${hora}).`,
        ``,
        `Tu turno sigue pendiente: el negocio decidirá si lo mantiene. Si todavía quieres ir, paga cuanto antes o escríbele.`,
        ...(deposit?.instructions ? [``, deposit.instructions] : []),
        ``,
        `Cuando pagues, responde *PAGUÉ ${numero}* o manda la foto del comprobante.`,
        `❌ Si ya no puedes ir, responde *CANCELAR ${numero}*.`,
      ].join("\n");

    case "notify_business_deposit_overdue":
      return [
        `⏰ *Anticipo vencido*`,
        ``,
        `${appt.customer_first_name} ${appt.customer_last_name}`,
        `Tel: ${appt.customer_phone}`,
        `📅 ${fechaLarga} ⏰ ${hora}`,
        `N° ${numero} · Anticipo: ${deposit?.amount}`,
        ``,
        `El turno sigue pendiente. Desde el turno puedes cancelarlo, darle más plazo o perdonar el anticipo.`,
      ].join("\n");

    case "payment_received":
      return [
        `✅ Hola ${cliente}! Recibimos tu pago de *${payment?.amount}*${payment?.method ? ` (${payment.method})` : ""} del turno N° ${numero} (${fechaLarga}, ${hora}).`,
        ``,
        `Pagado: *${payment?.paid}*`,
        `Pendiente: *${payment?.pending}*`,
      ].join("\n");

    case "notify_business_confirm":
      return [
        `✅ *Cliente confirmó asistencia*`,
        ``,
        `${appt.customer_first_name} ${appt.customer_last_name}`,
        `📅 ${fechaLarga} ⏰ ${hora}`,
        `N° ${numero}`,
      ].join("\n");
  }
}

// RLS decides: the appointment is visible only to members of its organization.
async function userCanSeeAppointment(
  req: Request,
  appointmentId: string
): Promise<boolean> {
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );
  const { data } = await userClient
    .from("appointments")
    .select("id")
    .eq("id", appointmentId)
    .maybeSingle();
  return !!data;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
