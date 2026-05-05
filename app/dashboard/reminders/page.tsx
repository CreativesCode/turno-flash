"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { Avatar, Button, Card } from "@/components/ui";
import { APPOINTMENT_STATUS } from "@/config/constants";
import { useAuth } from "@/contexts/auth-context";
import { useAppointments, useSendReminder, useToast } from "@/hooks";
import {
  AppointmentStatus,
  AppointmentWithDetails,
} from "@/types/appointments";
import { addDays, getLocalDateString, parseLocalDate } from "@/utils/date";
import {
  AlertCircle,
  BellRing,
  Calendar as CalendarIcon,
  Check,
  MessageCircle,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

/* The four day-chips at the top. */
const DAY_OFFSETS: { offset: number; label: string }[] = [
  { offset: 0, label: "Hoy" },
  { offset: 1, label: "Mañana" },
  { offset: 2, label: "+2 días" },
  { offset: 3, label: "+3 días" },
];

/* Statuses we fetch — pending/confirmed are "to-send", reminded/client_confirmed
 * are "already sent". We need both groups for stats. */
const REMINDER_STATUSES: AppointmentStatus[] = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.CONFIRMED,
  APPOINTMENT_STATUS.REMINDED,
  APPOINTMENT_STATUS.CLIENT_CONFIRMED,
];

const TO_SEND_STATUSES: AppointmentStatus[] = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.CONFIRMED,
];

const SENT_STATUSES: AppointmentStatus[] = [
  APPOINTMENT_STATUS.REMINDED,
  APPOINTMENT_STATUS.CLIENT_CONFIRMED,
];

function shortDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

export default function RemindersPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [filterDays, setFilterDays] = useState<number>(1);
  const [batchSending, setBatchSending] = useState(false);

  const canSendReminders = useMemo(
    () =>
      profile?.role === "admin" ||
      profile?.role === "owner" ||
      profile?.role === "staff",
    [profile]
  );

  const targetDate = useMemo(
    () => addDays(getLocalDateString(), filterDays),
    [filterDays]
  );

  const appointmentsFilters = useMemo(
    () => ({
      startDate: targetDate,
      endDate: targetDate,
      status: REMINDER_STATUSES,
    }),
    [targetDate]
  );

  const {
    appointments,
    loading,
    error: appointmentsError,
  } = useAppointments(appointmentsFilters);

  const sendReminderMutation = useSendReminder();

  /* ── Slices for stats + list ─────────────────────────────── */
  const toSend = useMemo(
    () =>
      [...appointments]
        .filter((a) => TO_SEND_STATUSES.includes(a.status as AppointmentStatus))
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appointments]
  );

  const sentCount = useMemo(
    () =>
      appointments.filter((a) =>
        SENT_STATUSES.includes(a.status as AppointmentStatus)
      ).length,
    [appointments]
  );

  const clientConfirmedCount = useMemo(
    () =>
      appointments.filter(
        (a) => a.status === APPOINTMENT_STATUS.CLIENT_CONFIRMED
      ).length,
    [appointments]
  );

  /** Response rate = client_confirmed / sent. `null` when no reminders sent yet. */
  const responseRate: number | null =
    sentCount === 0 ? null : Math.round((clientConfirmedCount / sentCount) * 100);

  /* ── Send single ─────────────────────────────────────────── */
  const sendReminder = useCallback(
    async (appointment: AppointmentWithDetails) => {
      if (!canSendReminders) return;
      const loadingToast = toast.loading(
        `Enviando recordatorio a ${appointment.customer_first_name}…`
      );
      try {
        const result = await sendReminderMutation.mutateAsync({
          appointmentId: appointment.id,
          method: "whatsapp",
        });
        toast.dismiss(loadingToast);
        if (result.whatsappUrl) window.open(result.whatsappUrl, "_blank");
        toast.success(
          "Recordatorio enviado",
          `Se envió a ${appointment.customer_first_name}`
        );
      } catch (err) {
        toast.dismiss(loadingToast);
        if (err instanceof Error) {
          toast.error("Error al enviar recordatorio", err.message);
        } else {
          toast.error("Error inesperado", "No se pudo enviar el recordatorio");
        }
      }
    },
    [canSendReminders, sendReminderMutation, toast]
  );

  /* ── Send batch ──────────────────────────────────────────── */
  const sendBatch = useCallback(async () => {
    if (!canSendReminders || toSend.length === 0) return;
    setBatchSending(true);
    let success = 0;
    let failed = 0;
    for (const apt of toSend) {
      try {
        const result = await sendReminderMutation.mutateAsync({
          appointmentId: apt.id,
          method: "whatsapp",
        });
        if (result.whatsappUrl) {
          window.open(result.whatsappUrl, "_blank");
        }
        success += 1;
        // Small breathing room so the browser doesn't drop popups
        await new Promise((r) => setTimeout(r, 400));
      } catch {
        failed += 1;
      }
    }
    setBatchSending(false);
    if (failed === 0) {
      toast.success(
        "Recordatorios enviados",
        `Se enviaron ${success} mensajes por WhatsApp`
      );
    } else {
      toast.error(
        `Enviado: ${success} · Fallido: ${failed}`,
        "Algunos recordatorios no se pudieron enviar"
      );
    }
  }, [canSendReminders, toSend, sendReminderMutation, toast]);

  /* ── Org guard ───────────────────────────────────────────── */
  if (!profile?.organization_id) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-warning-500" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              Sin organización
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Necesitás pertenecer a una organización para enviar recordatorios.
            </p>
            <Button
              variant="info"
              onClick={() => router.push("/dashboard")}
              className="mt-4"
            >
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
            <p className="text-sm text-foreground-muted">
              Cargando recordatorios...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const subtitle = `WhatsApp · ${toSend.length} por enviar`;

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Recordatorios"
        description="Envía recordatorios de turnos a tus clientes por WhatsApp. Gestiona notificaciones automáticas para mejorar la asistencia a las citas."
      />

      <div className="relative min-h-screen bg-background pb-24">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pb-3 pt-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  Recordatorios
                </h1>
                <p className="text-xs text-foreground-muted">{subtitle}</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard/appointments")}
                className="hidden sm:inline-flex"
              >
                Ver turnos
              </Button>
            </div>

            {/* Day chips (vertical: label + date stacked) */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
              {DAY_OFFSETS.map(({ offset, label }) => {
                const date = addDays(getLocalDateString(), offset);
                const active = filterDays === offset;
                return (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => setFilterDays(offset)}
                    className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-4 py-2 transition-colors ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-surface text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-sm font-bold leading-none">{label}</span>
                    <span
                      className={`text-[10px] leading-none ${
                        active ? "opacity-70" : "text-foreground-muted"
                      }`}
                    >
                      {shortDate(date)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
          {appointmentsError && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {appointmentsError}
            </div>
          )}

          {/* Stats — 3 mesh cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <MeshStat
              mesh="mesh-info"
              icon={<CalendarIcon className="h-4 w-4" />}
              value={toSend.length.toString()}
              label="Por enviar"
            />
            <MeshStat
              mesh="mesh-primary"
              icon={<Check className="h-4 w-4" />}
              value={sentCount.toString()}
              label="Enviados"
            />
            <MeshStat
              mesh="mesh-secondary"
              icon={<MessageCircle className="h-4 w-4" />}
              value={responseRate == null ? "—" : `${responseRate}%`}
              label="Tasa de respuesta"
            />
          </div>

          {/* Batch CTA */}
          {canSendReminders && toSend.length > 0 && (
            <div className="mt-4">
              <Button
                variant="mesh-primary"
                onClick={sendBatch}
                disabled={batchSending}
                className="h-12 w-full justify-center text-sm"
              >
                <Send className="h-4 w-4" />
                {batchSending
                  ? `Enviando ${toSend.length} recordatorios…`
                  : `Enviar a ${toSend.length} cliente${
                      toSend.length === 1 ? "" : "s"
                    } ahora`}
              </Button>
            </div>
          )}

          {/* List */}
          {toSend.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-muted">
                <span>Por enviar</span>
                <span className="rounded-full bg-surface-2 px-1.5 py-px text-[10px]">
                  {toSend.length}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="flex flex-col gap-2">
                {toSend.map((apt) => (
                  <ReminderRow
                    key={apt.id}
                    appointment={apt}
                    isSending={
                      sendReminderMutation.isPending &&
                      sendReminderMutation.variables?.appointmentId === apt.id
                    }
                    canSend={canSendReminders}
                    onSend={() => sendReminder(apt)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Already-sent summary (informational, only when relevant) */}
          {sentCount > 0 && (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-border bg-surface p-3 text-xs text-foreground-muted">
              <Check className="h-4 w-4 text-primary-500" />
              <span>
                Ya enviaste recordatorios a <strong>{sentCount}</strong> turno
                {sentCount === 1 ? "" : "s"} de este día. {clientConfirmedCount}
                {" confirmaron"}.
              </span>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

/* ────────────────────────────────────────────────────────────
 * MeshStat — 3-up dashboard tile with mesh background and white
 * text. Inlined (only used here for now); extract if a 2nd usage
 * appears (likely on dashboard desktop KPIs).
 * ──────────────────────────────────────────────────────────── */
function MeshStat({
  mesh,
  icon,
  value,
  label,
}: {
  mesh: string;
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div
      className={`${mesh} flex flex-col gap-2 rounded-xl p-3 text-white shadow-sm`}
    >
      {icon}
      <div>
        <div className="text-2xl font-extrabold leading-none tracking-tight">
          {value}
        </div>
        <div className="mt-1 text-[10px] text-white/85">{label}</div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * ReminderRow — one appointment to remind: avatar + customer +
 * time/service + green pill "Enviar". Mirrors the design's
 * "Por enviar" list row.
 * ──────────────────────────────────────────────────────────── */
function ReminderRow({
  appointment: a,
  isSending,
  canSend,
  onSend,
}: {
  appointment: AppointmentWithDetails;
  isSending: boolean;
  canSend: boolean;
  onSend: () => void;
}) {
  const fullName = `${a.customer_first_name} ${a.customer_last_name}`.trim();
  const time = a.start_time.length > 5 ? a.start_time.slice(0, 5) : a.start_time;
  return (
    <Card className="flex items-center gap-3 p-3">
      <Avatar name={fullName} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-foreground">
          {fullName}
        </div>
        <div className="mt-0.5 truncate text-xs text-foreground-muted">
          {time} · {a.service_name}
        </div>
      </div>
      {canSend && (
        <button
          type="button"
          onClick={onSend}
          disabled={isSending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-500 px-3 py-1.5 text-xs font-bold text-white shadow-glow-primary transition-[filter,transform] hover:brightness-110 active:translate-y-px disabled:opacity-60"
        >
          {isSending ? (
            <>
              <span className="block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Enviando…
            </>
          ) : (
            <>
              <MessageCircle className="h-3.5 w-3.5" />
              Enviar
            </>
          )}
        </button>
      )}
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="mt-5 rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-foreground-subtle">
        <BellRing className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-bold text-foreground">
        Sin recordatorios pendientes
      </h3>
      <p className="mt-1 text-sm text-foreground-muted">
        No hay turnos para recordar en esta fecha.
      </p>
    </div>
  );
}
