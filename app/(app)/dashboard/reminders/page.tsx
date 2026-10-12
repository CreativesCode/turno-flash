"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Avatar,
  Button,
  Card,
  ListGroup,
  ListRow,
  SectionLabel,
} from "@/components/ui";
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
        await sendReminderMutation.mutateAsync({
          appointmentId: appointment.id,
          method: "whatsapp",
        });
        toast.dismiss(loadingToast);
        toast.success(
          "Recordatorio enviado",
          `WhatsApp en camino a ${appointment.customer_first_name}`
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
        await sendReminderMutation.mutateAsync({
          appointmentId: apt.id,
          method: "whatsapp",
        });
        success += 1;
        // Pequeño respiro para no chocar contra el rate limit de OpenWA (60/min)
        await new Promise((r) => setTimeout(r, 1100));
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
            <h1 className="mt-4 text-2xl font-semibold text-foreground">
              Sin organización
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Necesitas pertenecer a una organización para enviar recordatorios.
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
            <div className="mb-4 h-6 w-6 animate-spin rounded-full border-2 border-border-2 border-t-foreground" />
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
        <div className="lg:sticky lg:top-0 lg:z-20 lg:bg-background/90 lg:backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pb-3 pt-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="font-display text-display text-foreground">
                  Recordatorios
                </h1>
                <p className="text-xs text-foreground-muted">{subtitle}</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard/appointments")}
                className="max-sm:hidden"
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
                    aria-pressed={active}
                    className={`flex shrink-0 cursor-pointer flex-col items-center gap-1 rounded-[14px] px-4 py-2 pb-2.5 transition-colors ${
                      active
                        ? "bg-inverse text-inverse-foreground"
                        : "text-foreground hover:bg-surface-2"
                    }`}
                  >
                    <span className="text-body font-semibold leading-none">{label}</span>
                    <span
                      className={`text-caption leading-none ${
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
            <div className="mb-4 rounded-card bg-danger-100 p-4 text-meta text-danger-600 dark:bg-danger-900 dark:text-danger-400">
              {appointmentsError}
            </div>
          )}

          {/* Stats */}
          <Card className="grid grid-cols-3 divide-x divide-border p-4">
            <Stat value={toSend.length.toString()} label="Por enviar" />
            <Stat value={sentCount.toString()} label="Enviados" />
            <Stat
              value={responseRate == null ? "—" : `${responseRate}%`}
              label="Respondieron"
            />
          </Card>

          {/* Batch CTA */}
          {canSendReminders && toSend.length > 0 && (
            <div className="mt-4">
              <Button
                variant="whatsapp"
                size="lg"
                onClick={sendBatch}
                disabled={batchSending}
                className="w-full"
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
            <div>
              <SectionLabel count={toSend.length}>Por enviar</SectionLabel>
              <ListGroup>
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
              </ListGroup>
            </div>
          )}

          {/* Already-sent summary (informational, only when relevant) */}
          {sentCount > 0 && (
            <div className="mt-6 flex items-center gap-2 px-1 text-meta text-foreground-muted">
              <Check className="h-4 w-4 text-primary" />
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-2 text-center">
      <div className="font-display text-[40px] leading-none text-foreground">
        {value}
      </div>
      <div className="mt-1.5 text-meta text-foreground-muted">{label}</div>
    </div>
  );
}

/** One appointment to remind, as a row with its "Enviar" button. */
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
    <ListRow
      leading={<Avatar name={fullName} seed={a.customer_id} size={40} />}
      title={fullName}
      subtitle={`${time} · ${a.service_name}`}
      trailing={
        canSend && (
          <Button
            variant="whatsapp"
            size="sm"
            onClick={onSend}
            loading={isSending}
            disabled={isSending}
          >
            {!isSending && <MessageCircle className="size-4" />}
            {isSending ? "Enviando…" : "Enviar"}
          </Button>
        )
      }
    />
  );
}

function EmptyState() {
  return (
    <div className="mt-5 rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-foreground-subtle">
        <BellRing className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">
        Sin recordatorios pendientes
      </h3>
      <p className="mt-1 text-sm text-foreground-muted">
        No hay turnos para recordar en esta fecha.
      </p>
    </div>
  );
}
