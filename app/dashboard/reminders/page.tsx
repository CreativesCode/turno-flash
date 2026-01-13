"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { AppointmentWithDetails } from "@/types/appointments";
import { createClient } from "@/utils/supabase/client";
import {
  AlertCircle,
  Bell,
  BellRing,
  Calendar,
  CheckCircle,
  Clock,
  MessageCircle,
  Phone,
  Send,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function RemindersPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter options
  const [filterDays, setFilterDays] = useState<number>(1); // 1 = tomorrow, 0 = today

  // Check if user can send reminders
  const canSendReminders = useMemo(() => {
    return (
      profile?.role === "admin" ||
      profile?.role === "owner" ||
      profile?.role === "staff"
    );
  }, [profile]);

  // Load appointments that need reminders
  const loadData = useCallback(async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);
      setError(null);

      // Calculate target date
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + filterDays);
      const dateStr = targetDate.toISOString().split("T")[0];

      // Load appointments for the target date that haven't been reminded
      const { data, error: loadError } = await supabase
        .from("appointments_with_details")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("appointment_date", dateStr)
        .in("status", ["confirmed", "pending"])
        .order("start_time", { ascending: true });

      if (loadError) {
        console.error("Error loading appointments:", loadError);
        setError("Error al cargar turnos");
      } else {
        setAppointments(data || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, supabase, filterDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Send reminder (manual)
  const sendReminder = async (appointment: AppointmentWithDetails) => {
    if (!canSendReminders) return;

    setSending(appointment.id);
    setError(null);

    try {
      // Log the reminder
      const { error: logError } = await supabase.from("reminder_logs").insert({
        appointment_id: appointment.id,
        reminder_type: "manual",
        method: "whatsapp", // or 'sms', 'email'
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_by: profile?.user_id,
      });

      if (logError) {
        console.error("Error logging reminder:", logError);
      }

      // Update appointment status to reminded
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "reminded" })
        .eq("id", appointment.id);

      if (updateError) {
        setError("Error al actualizar estado: " + updateError.message);
        return;
      }

      // Generate WhatsApp message
      const message = generateWhatsAppMessage(appointment);
      const phone = appointment.customer_phone.replace(/[^0-9]/g, "");
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
        message
      )}`;

      // Open WhatsApp
      window.open(whatsappUrl, "_blank");

      setSuccess(`Recordatorio enviado a ${appointment.customer_first_name}`);
      await loadData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error sending reminder:", err);
      setError("Error al enviar recordatorio");
    } finally {
      setSending(null);
    }
  };

  // Generate WhatsApp message
  const generateWhatsAppMessage = (appointment: AppointmentWithDetails) => {
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
  };

  // Send reminder to all
  const sendAllReminders = async () => {
    if (!canSendReminders || appointments.length === 0) return;

    setError(null);
    setSuccess(null);

    for (const apt of appointments) {
      await sendReminder(apt);
      // Small delay between messages
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setSuccess(`Recordatorios enviados a ${appointments.length} clientes`);
  };

  // Get filter label
  const getFilterLabel = () => {
    if (filterDays === 0) return "Hoy";
    if (filterDays === 1) return "Mañana";
    return `En ${filterDays} días`;
  };

  if (!profile?.organization_id) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
            <h1 className="mt-4 text-2xl font-bold text-black dark:text-zinc-50">
              Sin Organización
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Necesitas pertenecer a una organización para gestionar
              recordatorios
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Cargando recordatorios...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                Recordatorios
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Envía recordatorios a tus clientes por WhatsApp
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/appointments")}
              className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Ver Turnos
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {success}
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((days) => (
                <button
                  key={days}
                  onClick={() => setFilterDays(days)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    filterDays === days
                      ? "bg-blue-600 text-white"
                      : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {days === 0 ? "Hoy" : days === 1 ? "Mañana" : `${days} días`}
                </button>
              ))}
            </div>

            {appointments.length > 0 && canSendReminders && (
              <button
                onClick={sendAllReminders}
                className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <Send className="h-4 w-4" />
                Enviar Todos ({appointments.length})
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Turnos {getFilterLabel()}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-black dark:text-zinc-50">
                    {appointments.length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Pendientes
                  </p>
                  <p className="mt-1 text-2xl font-bold text-black dark:text-zinc-50">
                    {appointments.filter((a) => a.status === "pending").length}
                  </p>
                </div>
                <Bell className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Confirmados
                  </p>
                  <p className="mt-1 text-2xl font-bold text-black dark:text-zinc-50">
                    {
                      appointments.filter((a) => a.status === "confirmed")
                        .length
                    }
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Cómo funcionan los recordatorios
                </h3>
                <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                  Al hacer clic en &quot;Enviar&quot;, se abrirá WhatsApp con un
                  mensaje pre-escrito para el cliente. El turno se marcará como
                  &quot;Recordado&quot; en el sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          {appointments.length === 0 ? (
            <div className="rounded-lg bg-white p-12 text-center shadow-sm dark:bg-zinc-900">
              <BellRing className="mx-auto h-12 w-12 text-zinc-400" />
              <h3 className="mt-4 text-lg font-semibold text-black dark:text-zinc-50">
                No hay turnos para recordar
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                No hay turnos programados para {getFilterLabel().toLowerCase()}{" "}
                que necesiten recordatorio
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold dark:bg-blue-900/30 dark:text-blue-400">
                          {appointment.customer_first_name[0]}
                          {appointment.customer_last_name[0]}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
                            {appointment.customer_first_name}{" "}
                            {appointment.customer_last_name}
                          </h3>
                          <a
                            href={`tel:${appointment.customer_phone}`}
                            className="mt-1 flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <Phone className="h-4 w-4" />
                            {appointment.customer_phone}
                          </a>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-zinc-400" />
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {appointment.start_time} - {appointment.end_time}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-zinc-400" />
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {appointment.service_name}
                          </span>
                        </div>

                        {appointment.staff_first_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-zinc-400" />
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {appointment.staff_first_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          appointment.status === "confirmed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : appointment.status === "reminded"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                        }`}
                      >
                        {appointment.status === "confirmed"
                          ? "Confirmado"
                          : appointment.status === "reminded"
                          ? "Recordado"
                          : "Pendiente"}
                      </span>

                      {canSendReminders && (
                        <button
                          onClick={() => sendReminder(appointment)}
                          disabled={sending === appointment.id}
                          className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {sending === appointment.id ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Info */}
          <div className="mt-8 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
            <h3 className="font-medium text-black dark:text-zinc-50">
              💡 Consejos para recordatorios efectivos
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>• Envía recordatorios 24 horas antes del turno</li>
              <li>• Incluye toda la información relevante del turno</li>
              <li>• Pide confirmación para reducir ausencias</li>
              <li>• Revisa diariamente los turnos del día siguiente</li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
