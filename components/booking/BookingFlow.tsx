"use client";

import {
  type CustomerSubmit,
  DateTimeStep,
  DetailsStep,
  ServiceStep,
  StaffStep,
} from "@/components/booking/BookingSteps";
import { Button, Card, Logo } from "@/components/ui";
import { guessPhoneCountry } from "@/config/phone-countries";
import { useToast } from "@/hooks";
import {
  useCreatePublicBooking,
  usePublicBookingInfo,
} from "@/hooks/usePublicBooking.query";
import { PublicBookingError } from "@/services/public-booking.service";
import type {
  PublicBookingConfirmation,
  PublicService,
  PublicSlot,
} from "@/types/public-booking";
import { fmtDuration } from "@/utils/format";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarCheck, CalendarX, ChevronLeft, Hourglass } from "lucide-react";
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
  const { data: info, isLoading, error } = usePublicBookingInfo(slug);
  const bookMutation = useCreatePublicBooking();
  const toast = useToast();

  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<PublicService | null>(null);
  /** null = "no preference" */
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<PublicSlot | null>(null);
  const [confirmation, setConfirmation] = useState<PublicBookingConfirmation | null>(null);

  if (!slug || (!isLoading && (error || !info || !info.available))) {
    return (
      <Shell>
        <Card className="p-8 text-center">
          <CalendarX className="mx-auto h-10 w-10 text-foreground-subtle" />
          <h1 className="mt-3 text-lg font-extrabold text-foreground">
            Reservas no disponibles
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {error
              ? "No pudimos cargar la página. Revisa tu conexión e intenta de nuevo."
              : "Este negocio no está recibiendo reservas online en este momento."}
          </p>
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
    setStep("service");
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
      });
      setConfirmation(result);
      setStep("done");
    } catch (err) {
      if (err instanceof PublicBookingError && err.code === "slot_taken") {
        toast.error("Horario ocupado", err.message);
        setSlot(null);
        setStep("time");
        return;
      }
      toast.error(
        "No se pudo reservar",
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const previous = PREVIOUS_STEP[step];

  return (
    <Shell
      businessName={info.organization.name}
      subtitle={STEP_TITLES[step]}
      onBack={previous ? () => setStep(previous) : undefined}
    >
      {service && step !== "service" && step !== "done" && (
        <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
          <Chip>
            {service.name} · {fmtDuration(service.duration_minutes)}
          </Chip>
          {step !== "staff" && <Chip>{staffName(staffId) ?? "Sin preferencia"}</Chip>}
          {step === "details" && date && slot && (
            <Chip>
              {longDate(date)} · {slot.start_time}
            </Chip>
          )}
        </div>
      )}

      {step === "service" && (
        <ServiceStep
          services={info.services}
          onSelect={(s) => {
            setService(s);
            setStaffId(null);
            setDate(null);
            setStep("staff");
          }}
        />
      )}

      {step === "staff" && (
        <StaffStep
          staff={staffForService}
          onSelect={(id) => {
            setStaffId(id);
            setDate(null);
            setStep("time");
          }}
        />
      )}

      {step === "time" && service && (
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
            setStep("details");
          }}
        />
      )}

      {step === "details" && (
        <DetailsStep
          defaultCountry={guessPhoneCountry(info.organization.timezone)}
          isSubmitting={bookMutation.isPending}
          onSubmit={handleBook}
        />
      )}

      {step === "done" && confirmation && service && date && slot && (
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

          <Button variant="soft" onClick={reset} className="mt-5 w-full justify-center">
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
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
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
