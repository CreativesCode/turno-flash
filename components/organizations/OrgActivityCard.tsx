"use client";

import { Card, SegmentedControl } from "@/components/ui";
import { useOrganizationActivity } from "@/hooks/useAnalytics.query";
import { fmtMoney } from "@/utils/format";
import { formatInTimeZone } from "date-fns-tz";
import { Activity, BarChart3 } from "lucide-react";
import Link from "next/link";
import { ReactNode, useMemo, useState } from "react";

type PeriodKey = "30d" | "90d" | "all";

const PERIODS = [
  { value: "30d" as const, label: "30 días" },
  { value: "90d" as const, label: "90 días" },
  { value: "all" as const, label: "Siempre" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Period as the business's own calendar days; "all" sends no dates. */
function getRange(
  period: PeriodKey,
  timezone: string
): { start?: string; end?: string } {
  if (period === "all") return {};
  const days = period === "30d" ? 30 : 90;
  const now = Date.now();
  return {
    start: formatInTimeZone(now - (days - 1) * DAY_MS, timezone, "yyyy-MM-dd"),
    end: formatInTimeZone(now, timezone, "yyyy-MM-dd"),
  };
}

function formatWhen(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-2 px-3 py-2">
      <div className="truncate text-caption font-semibold text-foreground-muted">
        {label}
      </div>
      <div className="mt-0.5 truncate text-base font-semibold text-foreground">
        {value}
      </div>
      {hint && (
        <div className="truncate text-caption text-foreground-subtle">
          {hint}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-caption font-semibold uppercase tracking-wide text-foreground-subtle">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

export interface OrgActivityCardProps {
  organizationId: string;
  timezone: string;
  currency: string;
  appointmentsEnabled: boolean;
  tripsEnabled: boolean;
}

/** How much a business uses the app, for the platform admin (TUR0006). */
export function OrgActivityCard({
  organizationId,
  timezone,
  currency,
  appointmentsEnabled,
  tripsEnabled,
}: OrgActivityCardProps) {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const { start, end } = useMemo(
    () => getRange(period, timezone || "UTC"),
    [period, timezone]
  );
  const { data, isLoading, error } = useOrganizationActivity(
    organizationId,
    start,
    end
  );
  const money = (n: number) => fmtMoney(n, undefined, currency);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-400">
            <Activity className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Actividad</h2>
        </div>
        <SegmentedControl
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          label="Período de la actividad"
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-danger-600 dark:text-danger-400">
          {error.message}
        </p>
      )}

      {!error && (isLoading || !data) && (
        <div className="mt-4 h-40 w-full animate-pulse rounded-xl bg-surface-2" />
      )}

      {!error && data && (
        <>
          {appointmentsEnabled && (
            <Group title="Turnos">
              <Stat label="Turnos" value={data.appointments.total} />
              <Stat
                label="Esperando aprobación"
                value={data.appointments.pending}
              />
              <Stat
                label="Aceptados"
                value={data.appointments.accepted}
                hint="ni pendientes ni cancelados"
              />
              <Stat
                label="Confirmados por el cliente"
                value={data.appointments.client_confirmed}
              />
              <Stat label="Terminados" value={data.appointments.completed} />
              <Stat label="Cancelados" value={data.appointments.cancelled} />
              <Stat label="No vino" value={data.appointments.no_show} />
              <Stat
                label="Reservados online"
                value={data.appointments.online}
                hint={`${data.appointments.panel} desde el panel`}
              />
              <Stat
                label="Ingresos"
                value={money(data.appointments.revenue)}
                hint="de turnos terminados"
              />
            </Group>
          )}

          {tripsEnabled && (
            <Group title="Pasajes">
              <Stat label="Salidas" value={data.trips.departures} />
              <Stat
                label="Reservas"
                value={data.trips.bookings}
                hint={`${data.trips.confirmed} confirmadas · ${data.trips.pending} por confirmar`}
              />
              <Stat
                label="Reservas canceladas"
                value={data.trips.cancelled}
              />
              <Stat label="Asientos vendidos" value={data.trips.seats} />
              <Stat label="Cobrado" value={money(data.trips.collected)} />
            </Group>
          )}

          <Group title="Clientes y mensajes">
            <Stat
              label="Clientes nuevos"
              value={data.customers.new}
              hint={`${data.customers.total} en total`}
            />
            <Stat label="WhatsApp enviados" value={data.whatsapp_sent} />
          </Group>

          <Group title="Seguimiento">
            <Stat
              label="El dueño entró"
              value={formatWhen(data.owner_last_sign_in_at)}
            />
            {appointmentsEnabled && (
              <Stat
                label="Último turno creado"
                value={formatWhen(data.last_appointment_at)}
              />
            )}
            {tripsEnabled && (
              <Stat
                label="Última reserva de pasaje"
                value={formatWhen(data.last_trip_booking_at)}
              />
            )}
            <Stat
              label="Montaje"
              value={`${data.setup.staff} prof. · ${data.setup.services} serv.`}
              hint="activos ahora"
            />
          </Group>

          {appointmentsEnabled && (
            <Link
              href={`/dashboard/reports?org=${organizationId}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <BarChart3 className="h-4 w-4" />
              Ver reporte completo
            </Link>
          )}
        </>
      )}
    </Card>
  );
}
