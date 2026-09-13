"use client";

import { type CustomerSubmit, DetailsStep } from "@/components/booking/BookingSteps";
import {
  SeatsStep,
  TripListStep,
  hhmm,
  longDate,
  seatPriceOf,
  type SeatsSubmit,
} from "@/components/public-trips/TripsSteps";
import { Button, Card, Logo, RichText } from "@/components/ui";
import { guessPhoneCountry } from "@/config/phone-countries";
import { useToast } from "@/hooks";
import {
  useCreatePublicTripBooking,
  usePublicTripsInfo,
} from "@/hooks/usePublicTrips.query";
import { PublicTripsError } from "@/services/public-trips.service";
import type {
  PublicTrip,
  PublicTripBookingConfirmation,
} from "@/types/public-trips";
import { fmtMoney } from "@/utils/format";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BusFront, CalendarX, ChevronLeft, Hourglass } from "lucide-react";
import { ReactNode, useState } from "react";

type Step = "trips" | "seats" | "details" | "done";

const STEP_TITLES: Record<Step, string> = {
  trips: "Elige tu viaje",
  seats: "Tu reserva",
  details: "Tus datos",
  done: "Listo",
};

const PREVIOUS_STEP: Partial<Record<Step, Step>> = {
  seats: "trips",
  details: "seats",
};

/** Public bucket: the URL needs no session, same as the dashboard builds it. */
function vehiclePhotoUrl(path: string | null): string | null {
  if (!path) return null;
  return createClient().storage.from("trip-photos").getPublicUrl(path).data
    .publicUrl;
}

/**
 * Public seat booking page (PRP-002). No session: everything goes through the
 * public-trips edge function with the anon key.
 */
export function TripsFlow({ slug }: { slug: string }) {
  const { data: info, isLoading, error, refetch } = usePublicTripsInfo(slug);
  const bookMutation = useCreatePublicTripBooking();
  const toast = useToast();

  const [step, setStep] = useState<Step>("trips");
  const [tripId, setTripId] = useState<string | null>(null);
  const [seatsData, setSeatsData] = useState<SeatsSubmit | null>(null);
  const [confirmation, setConfirmation] =
    useState<PublicTripBookingConfirmation | null>(null);

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
              : "Este negocio no está recibiendo reservas de viajes en este momento."}
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

  const currency = info.organization.currency || "USD";
  const money = (amount: number) => fmtMoney(amount, undefined, currency);
  // Always read from the latest fetch: the seats left change while the
  // customer fills the form, and the page keeps revalidating underneath.
  const trip: PublicTrip | null =
    info.trips.find((candidate) => candidate.id === tripId) ?? null;

  const reset = () => {
    setStep("trips");
    setTripId(null);
    setSeatsData(null);
    setConfirmation(null);
  };

  /** Back to the list when the chosen departure is gone or full. */
  const bounceToList = (message: string) => {
    toast.error("Se llenó esa salida", message);
    setSeatsData(null);
    setStep("trips");
  };

  const handleSeats = async (data: SeatsSubmit) => {
    setSeatsData(data);
    // One last check before asking for personal data, so the customer does
    // not type everything to be told the bus is full.
    const fresh = await refetch();
    const current =
      fresh.data && fresh.data.available
        ? fresh.data.trips.find((candidate) => candidate.id === tripId)
        : null;
    if (!current) {
      bounceToList("Esa salida ya no está disponible.");
      return;
    }
    if (current.seats_left < data.seats) {
      bounceToList(
        current.seats_left > 0
          ? `Quedan ${current.seats_left} asientos.`
          : "Ya no quedan asientos."
      );
      return;
    }
    setStep("details");
  };

  const handleBook = async (customer: CustomerSubmit) => {
    if (!trip || !seatsData) return;
    try {
      const result = await bookMutation.mutateAsync({
        slug,
        trip_id: trip.id,
        seats: seatsData.seats,
        passenger_names: seatsData.passengerNames,
        pickup_point_id: seatsData.pickupPointId,
        round_trip: seatsData.roundTrip,
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
      if (err instanceof PublicTripsError && err.code === "not_enough_seats") {
        bounceToList(err.message);
        return;
      }
      toast.error(
        "No se pudo reservar",
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const previous = PREVIOUS_STEP[step];
  const point = trip?.pickup_points.find(
    (candidate) => candidate.id === seatsData?.pickupPointId
  );

  return (
    <Shell
      businessName={info.organization.name}
      subtitle={STEP_TITLES[step]}
      onBack={previous ? () => setStep(previous) : undefined}
    >
      {trip && step !== "trips" && step !== "done" && (
        <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
          <Chip>
            {trip.title} · {hhmm(trip.departure_time)}
          </Chip>
          {step === "details" && seatsData && (
            <>
              <Chip>
                {seatsData.seats} asiento{seatsData.seats === 1 ? "" : "s"}
              </Chip>
              {seatsData.roundTrip && <Chip>Ida y vuelta</Chip>}
              {point && <Chip>{point.name}</Chip>}
            </>
          )}
        </div>
      )}

      {step === "trips" && (
        <TripListStep
          trips={info.trips}
          currency={currency}
          photoUrl={vehiclePhotoUrl}
          onSelect={(selected) => {
            setTripId(selected.id);
            setSeatsData(null);
            setStep("seats");
          }}
        />
      )}

      {step === "seats" && trip && (
        <SeatsStep trip={trip} currency={currency} onSubmit={handleSeats} />
      )}

      {step === "details" && (
        <DetailsStep
          defaultCountry={guessPhoneCountry(info.organization.timezone)}
          isSubmitting={bookMutation.isPending}
          onSubmit={handleBook}
        />
      )}

      {step === "done" && confirmation && trip && seatsData && (
        <Card className="p-6 text-center">
          {confirmation.status === "confirmed" ? (
            <BusFront className="mx-auto h-12 w-12 text-primary-600" />
          ) : (
            <Hourglass className="mx-auto h-12 w-12 text-warning-600" />
          )}
          <h2 className="mt-3 text-xl font-extrabold tracking-tight text-foreground">
            {confirmation.status === "confirmed"
              ? "¡Asiento reservado!"
              : "Solicitud enviada"}
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {confirmation.status === "confirmed"
              ? `Te esperamos. ${info.organization.name} te va a escribir con los detalles del viaje.`
              : `${info.organization.name} va a revisar tu solicitud y te va a contactar para confirmarla.`}
          </p>

          <dl className="mt-5 grid gap-2 rounded-xl bg-surface-2 p-4 text-left text-sm">
            <SummaryRow label="Viaje" value={trip.title} />
            <SummaryRow
              label="Sale"
              value={`${longDate(trip.departure_date)} · ${hhmm(
                trip.departure_time
              )}`}
            />
            {point && <SummaryRow label="Te recogemos en" value={point.name} />}
            <SummaryRow
              label="Asientos"
              value={`${seatsData.seats}${
                seatsData.roundTrip ? " · ida y vuelta" : ""
              }`}
            />
            <SummaryRow
              label="Total"
              value={money(
                seatPriceOf(trip, point, seatsData.roundTrip) * seatsData.seats
              )}
            />
            {confirmation.booking_number && (
              <SummaryRow
                label="N° de reserva"
                value={confirmation.booking_number}
              />
            )}
          </dl>

          {confirmation.deposit_status === "pending" &&
            (confirmation.deposit_amount ?? 0) > 0 && (
              <div className="mt-4 rounded-xl border border-warning-600 bg-warning-50 p-4 text-left text-sm dark:border-warning-400 dark:bg-warning-900/20">
                <p className="font-bold text-warning-800 dark:text-warning-300">
                  Falta el anticipo de {money(confirmation.deposit_amount ?? 0)}
                </p>
                {confirmation.hold_expires_at && (
                  <p className="mt-0.5 text-xs text-warning-800 dark:text-warning-300">
                    Guardamos tus asientos hasta el{" "}
                    {format(
                      new Date(confirmation.hold_expires_at),
                      "d 'de' MMMM 'a las' HH:mm",
                      { locale: es }
                    )}
                    .
                  </p>
                )}
                {info.organization.deposit_instructions && (
                  <div className="mt-2 text-xs text-foreground">
                    <RichText text={info.organization.deposit_instructions} />
                  </div>
                )}
              </div>
            )}

          <Button
            variant="soft"
            onClick={reset}
            className="mt-5 w-full justify-center"
          >
            Reservar otro viaje
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
              {subtitle && (
                <div className="text-xs text-foreground-muted">{subtitle}</div>
              )}
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
      <dt className="shrink-0 text-foreground-muted">{label}</dt>
      <dd className="text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}
