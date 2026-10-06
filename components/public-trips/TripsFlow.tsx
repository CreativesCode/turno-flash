"use client";

import {
  type CustomerSubmit,
  type DetailsDraft,
  DetailsStep,
} from "@/components/booking/BookingSteps";
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
import { useRequestKey } from "@/hooks/useRequestKey";
import { useStepHistory } from "@/hooks/useStepHistory";
import { PublicTripsError } from "@/services/public-trips.service";
import type {
  PublicTrip,
  PublicTripBookingConfirmation,
} from "@/types/public-trips";
import { fmtMoney } from "@/utils/format";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BusFront,
  CalendarX,
  ChevronLeft,
  Hourglass,
  WifiOff,
} from "lucide-react";
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
  const requestKey = useRequestKey();
  const toast = useToast();

  const { step, go, replace, back } = useStepHistory<Step>("trips");
  const [tripId, setTripId] = useState<string | null>(null);
  const [seatsData, setSeatsData] = useState<SeatsSubmit | null>(null);
  const [confirmation, setConfirmation] =
    useState<PublicTripBookingConfirmation | null>(null);
  const [draft, setDraft] = useState<DetailsDraft | null>(null);

  // A failed background refresh (every 30 s, and when coming back from
  // WhatsApp) keeps the last data: only a page that never loaded shows an
  // error, so a signal drop does not wipe the seats and names typed.
  const offline =
    !!error &&
    (!(error instanceof PublicTripsError) ||
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
              : "Este negocio no está recibiendo reservas de viajes en este momento."}
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

  const currency = info.organization.currency || "USD";
  const money = (amount: number) => fmtMoney(amount, undefined, currency);
  // Always read from the latest fetch: the seats left change while the
  // customer fills the form, and the page keeps revalidating underneath.
  const trip: PublicTrip | null =
    info.trips.find((candidate) => candidate.id === tripId) ?? null;

  const reset = () => {
    replace("trips");
    setTripId(null);
    setSeatsData(null);
    setConfirmation(null);
  };

  /** Seats left on the chosen departure right now (null = gone). */
  const freshSeatsLeft = async (): Promise<number | null> => {
    const fresh = await refetch();
    const current =
      fresh.data && fresh.data.available
        ? fresh.data.trips.find((candidate) => candidate.id === tripId)
        : null;
    return current ? current.seats_left : null;
  };

  /**
   * Fewer seats than asked: stay on (or return to) the seats step with
   * everything typed. Only a full or gone departure goes back to the list.
   * The step counts are history entries from the current step.
   */
  const handleShortage = (
    seatsLeft: number | null,
    stepsToSeats: number,
    stepsToList: number
  ) => {
    if (seatsLeft && seatsLeft > 0) {
      toast.error(
        "Quedan menos asientos",
        "Quedan " + seatsLeft + ". Ajusta la cantidad, por favor."
      );
      if (stepsToSeats > 0) back(stepsToSeats);
      return;
    }
    toast.error(
      "Se llenó esa salida",
      seatsLeft === null
        ? "Esa salida ya no está disponible."
        : "Ya no quedan asientos."
    );
    setSeatsData(null);
    back(stepsToList);
  };

  const handleSeats = async (data: SeatsSubmit) => {
    setSeatsData(data);
    // One last check before asking for personal data, so the customer does
    // not type everything to be told the bus is full.
    const seatsLeft = await freshSeatsLeft();
    if (seatsLeft === null || seatsLeft < data.seats) {
      handleShortage(seatsLeft, 0, 1);
      return;
    }
    go("details");
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
        request_key: requestKey.keyFor(
          JSON.stringify([trip.id, seatsData])
        ),
      });
      requestKey.reset();
      setConfirmation(result);
      // Replaces "details": back from the confirmation must not resubmit
      replace("done");
    } catch (err) {
      if (err instanceof PublicTripsError && err.code === "not_enough_seats") {
        handleShortage(await freshSeatsLeft(), 1, 2);
        return;
      }
      toast.error(
        "No se pudo reservar",
        err instanceof Error ? err.message : undefined
      );
    }
  };

  // History entries can outlive the choices they need (after "Hacer otra
  // reserva"): fall back to an earlier step instead of rendering nothing.
  const view: Step =
    step !== "trips" && step !== "done" && !trip
      ? "trips"
      : step === "details" && !seatsData
        ? "seats"
        : step;
  const previous = PREVIOUS_STEP[view];
  const point = trip?.pickup_points.find(
    (candidate) => candidate.id === seatsData?.pickupPointId
  );

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
      {trip && view !== "trips" && view !== "done" && (
        <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
          <Chip>
            {trip.title} · {hhmm(trip.departure_time)}
          </Chip>
          {view === "details" && seatsData && (
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

      {view === "trips" && (
        <TripListStep
          trips={info.trips}
          currency={currency}
          photoUrl={vehiclePhotoUrl}
          onSelect={(selected) => {
            // Coming back to the same departure keeps the seats and names
            if (selected.id !== tripId) setSeatsData(null);
            setTripId(selected.id);
            go("seats");
          }}
        />
      )}

      {view === "seats" && trip && (
        <SeatsStep
          trip={trip}
          currency={currency}
          onSubmit={handleSeats}
          initial={seatsData}
        />
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

      {view === "done" && confirmation && trip && seatsData && (
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

          <Button size="lg"
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
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
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
