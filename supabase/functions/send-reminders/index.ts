// Edge Function para enviar recordatorios automáticos
// Se puede configurar con un cron job para ejecutarse diariamente

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Appointment {
  id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_name: string;
  staff_first_name: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  organization_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body (optional filters)
    let targetDate: string;
    let organizationId: string | null = null;

    try {
      const body = await req.json();
      targetDate = body.date || getTomorrowDate();
      organizationId = body.organization_id || null;
    } catch {
      targetDate = getTomorrowDate();
    }

    // Query appointments that need reminders
    let query = supabase
      .from("appointments_with_details")
      .select("*")
      .eq("appointment_date", targetDate)
      .in("status", ["confirmed", "pending"]);

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data: appointments, error: queryError } = await query;

    if (queryError) {
      throw new Error(`Error querying appointments: ${queryError.message}`);
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No appointments to remind",
          count: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Process reminders
    const results = [];

    for (const appointment of appointments as Appointment[]) {
      try {
        // Generate reminder message
        const message = generateReminderMessage(appointment);

        // Log the reminder attempt
        await supabase.from("reminder_logs").insert({
          appointment_id: appointment.id,
          reminder_type: "automatic",
          method: "whatsapp",
          message_content: message,
          status: "pending",
          scheduled_for: new Date().toISOString(),
        });

        // Here you would integrate with your messaging service
        // For example: Twilio, WhatsApp Business API, etc.
        // const sendResult = await sendWhatsAppMessage(appointment.customer_phone, message);

        // Update appointment status to reminded
        await supabase
          .from("appointments")
          .update({ status: "reminded" })
          .eq("id", appointment.id);

        // Update reminder log
        await supabase
          .from("reminder_logs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("appointment_id", appointment.id)
          .eq("reminder_type", "automatic")
          .is("sent_at", null);

        results.push({
          appointment_id: appointment.id,
          customer: `${appointment.customer_first_name} ${appointment.customer_last_name}`,
          phone: appointment.customer_phone,
          status: "sent",
        });
      } catch (err) {
        console.error(`Error processing reminder for ${appointment.id}:`, err);
        results.push({
          appointment_id: appointment.id,
          customer: `${appointment.customer_first_name} ${appointment.customer_last_name}`,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} reminders`,
        date: targetDate,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-reminders function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper functions
// Note: Edge Functions run in UTC, and PostgreSQL DATE columns are timezone-agnostic
// so using toISOString() here is appropriate for server-side date calculations
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

function generateReminderMessage(appointment: Appointment): string {
  const date = new Date(appointment.appointment_date);
  const formattedDate = date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return `🗓️ *Recordatorio de Turno*

Hola ${appointment.customer_first_name}! 👋

Te recordamos que tienes un turno programado:

📅 *Fecha:* ${formattedDate}
⏰ *Hora:* ${appointment.start_time}
💇 *Servicio:* ${appointment.service_name}
${
  appointment.staff_first_name
    ? `👤 *Con:* ${appointment.staff_first_name}`
    : ""
}

Por favor confirma tu asistencia respondiendo:
✅ *SÍ* - Confirmo mi turno
❌ *NO* - No podré asistir

¡Te esperamos! 🙌`;
}

// Placeholder for WhatsApp API integration
// async function sendWhatsAppMessage(phone: string, message: string) {
//   // Integrate with Twilio or WhatsApp Business API
//   // const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
//   // const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
//   // const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
//
//   // Return send result
// }
