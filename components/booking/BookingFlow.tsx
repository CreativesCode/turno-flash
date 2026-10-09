"use client";

import {
  type CustomerSubmit,
  DateTimeStep,
  type DetailsDraft,
  DetailsStep,
  ServiceStep,
  StaffStep,
} from "@/components/booking/BookingSteps";
import {
  BusinessContactLink,
  BusinessTimeNote,
} from "@/components/booking/BusinessInfo";
import { Button, Card, Logo } from "@/components/ui";
import { guessPhoneCountry } from "@/config/phone-countries";
// Not the "@/hooks" barrel: it drags the whole dashboard into the public page
import { useToast } from "@/hooks/useToast";
import {
  publicBookingKeys,
  useCreatePublicBooking,
  usePublicBookingInfo,
} from "@/hooks/usePublicBooking.query";
import { useQueryClient } from "@tanstack/react-query";
import { useRequestKey } from "@/hooks/useRequestKey";
import { useSessionState } from "@/hooks/useSessionState";
import { useStepHistory } from "@/hooks/useStepHistory";
import { PublicBookingError } from "@/services/public-booking.service";
import type {
  PublicBookingConfirmation,
  PublicService,
  PublicSlot,
} from "@/types/public-booking";
import { fmtDuration } from "@/utils/format";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarCheck,
  CalendarX,
  ChevronLeft,
  Hourglass,
  WifiOff,
} from "lucide-react";
import { ReactNode, useState } from "react";

type Step = "service" | "staff" | "time" | "details" | "done";

const STEP_TITLES: Record<Step, string> = {
  service: "Elige un servicio",
  staff: "¿Con quién?",
  time: "Elige día y horario",
  details: "Tus datos",
  done: "Listo",
};

const PREVIOUS_STEP: Partial<Record<Step, Step>> = {
  staff: "service",
  time: "staff",
  details: "time",
};

function longDate(date: string): string {
  return format(parseISO(date), "EEEE d 'de' MMMM", { locale: es });
}

export function BookingFlow({ slug }: { slug: string }) {
  const { data: info, isLoading, error, refetch } = usePublicBookingInfo(slug);
  const bookMutation = useCreatePublicBooking();
  const queryClient = useQueryClient();
  const requestKey = useRequestKey();
  const toast = useToast();

  const { step, go, replace, back } = useStepHistory<Step>("service");
  // Kept in the tab's storage: Android may reload the page after WhatsApp
  const storageKey = `booking:${slug}`;
  const [service, setService] = useSessionState<PublicService | null>(
    `${storageKey}:service`,
    null
  );
  /** null = "no preference" */
  const [staffId, setStaffId] = useSessionState<string | null>(`${storageKey}:staff`, null);
  const [date, setDate] = useSessionState<string | null>(`${storageKey}:date`, null);
  const [slot, setSlot] = useSessionState<PublicSlot | null>(`${storageKey}:slot`, null);
  const [limitReached, setLimitReached] = useState(false);
  const [confirmation, setConfirmation] = useSessionState<PublicBookingConfirmation | null>(
    `${storageKey}:confirmation`,
    null
  );
  const [draft, setDraft] = useSessionState<DetailsDraft | null>(`${storageKey}:draft`, null);

  // A failed background refresh keeps the last data: only a page that never
  // loaded shows an error, so a signal drop does not wipe the form.
  const offline =
    !!error &&
    (!(error instanceof PublicBookingError) ||
      error.code === "network" ||
      error.code === "server_error");

  if (!slug || (!isLoading && (!info || !info.available))) {
    return (
      <Shell>
        <Card className="p-8 text-center">
          {offline ? (
            <WifiOff className="mx-auto h-10 w-10 text-foreground-subtle" />
          ) : (
            <CalendarX className="mx-auto h-10 w-10 text-foreground-subtle" />
          )}
          <h1 className="mt-3 text-lg font-extrabold text-foreground">
            {offline ? "Sin conexión" : "Reservas no disponibles"}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {offline
              ? "No pudimos cargar la página. Revisa tu conexión."
              : "Este negocio no está recibiendo reservas online en este momento."}
          </p>
          {offline && (
            <Button size="lg"
              variant="soft"
              onClick={() => void refetch()}
              className="mt-4 w-full justify-center"
            >
              Reintentar
            </Button>
          )}
        </Card>
      </Shell>
    );
  }

  if (isLoading || !info || !info.available) {
    return (
      <Shell>
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
        </div>
      </Shell>
    );
  }

  const staffForService = service
    ? info.staff.filter((s) => service.staff_ids.includes(s.id))
    : [];
  const staffName = (id: string | null | undefined) =>
    info.staff.find((s) => s.id === id)?.name ?? null;

  const reset = () => {
    replace("service");
    setService(null);
    setStaffId(null);
    setDate(null);
    setSlot(null);
    setConfirmation(null);
  };

  const handleBook = async (customer: CustomerSubmit) => {
    if (!service || !date || !slot) return;
    try {
      const result = await bookMutation.mutateAsync({
        slug,
        service_id: service.id,
        staff_id: staffId,
        date,
        start_time: slot.start_time,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: `${customer.country_code} ${customer.phone}`,
        email: customer.email || undefined,
        notes: customer.notes || undefined,
        website: customer.website,
        request_key: requestKey.keyFor(
          [service.id, staffId, date, slot.start_time].join("|")
        ),
      });
      requestKey.reset();
      setConfirmation(result);
      // Replaces "details": back from the confirmation must not resubmit
      replace("done");
    } catch (err) {
      if (err instanceof PublicBookingError && err.code === "slot_taken") {
        toast.error("Horario ocupado", err.message);
        // Drop it from the cached list right away: the refetch takes a while
        // on a slow network and the same time would still be offered
        queryClient.setQueryData<PublicSlot[]>(
          publicBookingKeys.slots(slug, service.id, staffId, date),
          (slots) =>
            slots?.filter(
              (s) =>
                !(s.start_time === slot.start_time && s.staff_id === slot.staff_id)
            )
        );
        setSlot(null);
        back();
        return;
      }
      if (
        err instanceof PublicBookingError &&
        err.code === "too_many_bookings"
      ) {
        setLimitReached(true);
      }
      toast.error(
        "No se pudo reservar",
        err instanceof Error ? err.message : undefined
      );
    }
  };

  // History entries can outlive the choices they need (after "Hacer otra
  // reserva"): fall back to the first step instead of rendering nothing.
  const view: Step = step !== "service" && step !== "done" && !service ? "service" : step;
  const previous = PREVIOUS_STEP[view];

  return (
    <Shell
      businessName={info.organization.name}
      subtitle={STEP_TITLES[view]}
      onBack={previous ? () => back() : undefined}
    >
      {offline && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-warning-50 px-3 py-2 text-xs font-semibold text-warning-800 dark:bg-warning-900/20 dark:text-warning-400">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          Sin conexión, reintentando… Lo que escribiste se mantiene.
        </p>
      )}
      {service && view !== "service" && view !== "done" && (
        <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
          <Chip>
            {service.name} · {fmtDuration(service.duration_minutes)}
          </Chip>
          {view !== "staff" && <Chip>{staffName(staffId) ?? "Sin preferencia"}</Chip>}
          {view === "details" && date && slot && (
            <Chip>
              {longDate(date)} · {slot.start_time}
            </Chip>
          )}
        </div>
      )}

      {view === "service" && (
        <ServiceStep
          services={info.services}
          onSelect={(s) => {
            // Nothing to choose with a single professional: skip "¿Con quién?"
            const candidates = info.staff.filter((member) =>
              s.staff_ids.includes(member.id)
            );
            setService(s);
            setStaffId(candidates.length === 1 ? candidates[0].id : null);
            setDate(null);
            go(candidates.length === 1 ? "time" : "staff");
          }}
        />
      )}

      {view === "staff" && (
        <StaffStep
          staff={staffForService}
          onSelect={(id) => {
            setStaffId(id);
            setDate(null);
            go("time");
          }}
        />
      )}

      {view === "time" && service && (
        <>
          <BusinessTimeNote timezone={info.organization.timezone} />
          <DateTimeStep
          slug={slug}
          service={service}
          staffId={staffId}
          staff={staffForService}
          today={info.today}
          allowSameDay={info.allow_same_day}
          date={date}
          onDateChange={setDate}
          onSelect={(selectedDate, selectedSlot) => {
            setDate(selectedDate);
            setSlot(selectedSlot);
            go("details");
          }}
        />
        </>
      )}

      {limitReached && info.organization.contact_phone && (
        <Card className="mb-3 p-4 text-sm text-foreground-muted">
          <p>Ya tienes varios turnos próximos aquí. Si necesitas otro, escríbele al negocio.</p>
          <BusinessContactLink
            phone={info.organization.contact_phone}
            className="mt-3"
          />
        </Card>
      )}

      {view === "details" && (
        <DetailsStep
          defaultCountry={guessPhoneCountry(info.organization.timezone)}
          isSubmitting={bookMutation.isPending}
          onSubmit={handleBook}
          initial={draft}
          onChange={setDraft}
        />
      )}

      {view === "done" && confirmation && service && date && slot && (
        <Card className="p-6 text-center">
          {confirmation.status === "confirmed" ? (
            <CalendarCheck className="mx-auto h-12 w-12 text-primary-600" />
          ) : (
            <Hourglass className="mx-auto h-12 w-12 text-warning-600" />
          )}
          <h2 className="mt-3 text-xl font-extrabold tracking-tight text-foreground">
            {confirmation.status === "confirmed" ? "¡Turno confirmado!" : "Solicitud enviada"}
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {confirmation.status === "confirmed"
              ? `Te esperamos en ${info.organization.name}.`
              : `${info.organization.name} revisará tu solicitud y te contactará para confirmarla.`}
          </p>

          <dl className="mt-5 grid gap-2 rounded-xl bg-surface-2 p-4 text-left text-sm">
            <SummaryRow label="Servicio" value={service.name} />
            <SummaryRow label="Día" value={longDate(date)} />
            <SummaryRow label="Hora" value={confirmation.start_time ?? slot.start_time} />
            <SummaryRow
              label="Profesional"
              value={staffName(confirmation.staff_id ?? slot.staff_id) ?? "—"}
            />
            {confirmation.appointment_number && (
              <SummaryRow label="N° de turno" value={confirmation.appointment_number} />
            )}
          </dl>

          <BusinessContactLink
            phone={info.organization.contact_phone}
            className="mt-5"
          />
          <Button size="lg" variant="soft" onClick={reset} className="mt-3 w-full justify-center">
            Hacer otra reserva
          </Button>
        </Card>
      )}
    </Shell>
  );
}

function Shell({
  businessName,
  subtitle,
  onBack,
  children,
}: {
  businessName?: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {businessName && (
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
          <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Volver"
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-extrabold tracking-tight text-foreground">
                {businessName}
              </div>
              {subtitle && <div className="text-xs text-foreground-muted">{subtitle}</div>}
            </div>
          </div>
        </header>
      )}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">{children}</main>
      <footer className="flex items-center justify-center gap-1.5 pb-8 pt-4 text-[11px] text-foreground-subtle">
        <Logo size={14} />
        Reservas con TurnoFlash
      </footer>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-semibold text-foreground-muted">
      {children}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-foreground-muted">{label}</dt>
      <dd className="text-right font-semibold text-foreground first-letter:uppercase">{value}</dd>
    </div>
  );
}
