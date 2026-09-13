"use client";

import { Button, Card, RichText, Select, sheetInputClasses } from "@/components/ui";
import type { PublicPickupPoint, PublicTrip } from "@/types/public-trips";
import { fmtMoney } from "@/utils/format";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Bus, Clock, MapPin, Users } from "lucide-react";
import { FormEvent, useState } from "react";

const money = (amount: number, currency: string) =>
  fmtMoney(amount, undefined, currency);

export function longDate(date: string): string {
  return format(parseISO(date), "EEEE d 'de' MMMM", { locale: es });
}

export function hhmm(time: string | null): string {
  return time ? time.slice(0, 5) : "";
}

/** What one seat costs, resolved the same way the server does. */
export function seatPriceOf(
  trip: PublicTrip,
  point: PublicPickupPoint | undefined,
  roundTrip: boolean
): number {
  if (roundTrip) {
    return point ? point.price_round_trip : trip.price_round_trip;
  }
  return point ? point.price_per_seat : trip.price_per_seat;
}

/** The cheapest seat of the departure: what the card advertises. */
function fromPrice(trip: PublicTrip): number {
  if (trip.pickup_points.length === 0) return trip.price_per_seat;
  return Math.min(...trip.pickup_points.map((point) => point.price_per_seat));
}

function opensAt(value: string | null): string {
  if (!value) return "";
  return format(new Date(value), "d 'de' MMMM 'a las' HH:mm", { locale: es });
}

// ---------------------------------------------------------------
// Step 1 — pick a departure
// ---------------------------------------------------------------

export function TripListStep({
  trips,
  currency,
  photoUrl,
  onSelect,
}: {
  trips: PublicTrip[];
  currency: string;
  photoUrl: (path: string | null) => string | null;
  onSelect: (trip: PublicTrip) => void;
}) {
  if (trips.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Bus className="mx-auto h-10 w-10 text-foreground-subtle" />
        <h2 className="mt-3 text-base font-bold text-foreground">
          No hay salidas próximas
        </h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Volvé a mirar en unos días: acá van a aparecer los próximos viajes.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {trips.map((trip) => {
        const soldOut = trip.seats_left <= 0;
        const closed = !trip.booking_open;
        const photo = photoUrl(trip.vehicle_photo_path);

        return (
          <Card key={trip.id} className="overflow-hidden p-0">
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element -- Storage URL, no loader configured
              <img
                src={photo}
                alt={trip.vehicle_description ?? "Foto del vehículo"}
                className="h-32 w-full object-cover"
              />
            )}
            <div className="p-4">
              <h2 className="text-base font-extrabold tracking-tight text-foreground">
                {trip.title}
              </h2>
              <p className="mt-0.5 text-xs capitalize text-foreground-muted">
                {longDate(trip.departure_date)} · {hhmm(trip.departure_time)}
                {trip.return_time ? ` · vuelve ${hhmm(trip.return_time)}` : ""}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {soldOut
                    ? "Sin asientos"
                    : `Quedan ${trip.seats_left} asientos`}
                </span>
                <span className="font-bold text-foreground ml-1">
                  Desde {money(fromPrice(trip), currency)}
                </span>
              </div>

              {closed ? (
                <div className="mt-3 rounded-lg bg-surface-2 p-2.5 text-xs text-foreground-muted">
                  {trip.booking_opens_at &&
                    new Date(trip.booking_opens_at) > new Date()
                    ? `Las reservas abren el ${opensAt(trip.booking_opens_at)}.`
                    : "Las reservas de esta salida ya cerraron."}
                </div>
              ) : (
                <Button
                  variant="mesh-primary"
                  onClick={() => onSelect(trip)}
                  disabled={soldOut}
                  className="mt-3 w-full justify-center"
                >
                  {soldOut ? "Sin asientos" : "Reservar"}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------
// Step 2 — stop, trip type, seats and one name per seat
// ---------------------------------------------------------------

export interface SeatsSubmit {
  pickupPointId: string | null;
  roundTrip: boolean;
  seats: number;
  passengerNames: string[];
}

export function SeatsStep({
  trip,
  currency,
  onSubmit,
}: {
  trip: PublicTrip;
  currency: string;
  onSubmit: (data: SeatsSubmit) => void;
}) {
  const [pickupPointId, setPickupPointId] = useState(
    trip.pickup_points.length === 1 ? trip.pickup_points[0].id : ""
  );
  const [roundTrip, setRoundTrip] = useState(false);
  const [seats, setSeats] = useState(1);
  const [names, setNames] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);

  const point = trip.pickup_points.find((p) => p.id === pickupPointId);
  const price = seatPriceOf(trip, point, roundTrip);
  const deposit = point ? point.deposit_per_seat : trip.deposit_per_seat;
  const maxSeats = Math.max(
    Math.min(trip.max_seats_per_booking, trip.seats_left),
    1
  );

  const changeSeats = (next: number) => {
    const value = Math.min(Math.max(next, 1), maxSeats);
    setSeats(value);
    setNames((prev) => {
      const copy = [...prev];
      copy.length = value;
      return Array.from(copy, (name) => name ?? "");
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (trip.pickup_points.length > 0 && !pickupPointId) {
      setError("Elegí dónde querés que te recojan.");
      return;
    }
    if (names.some((name) => !name.trim())) {
      setError("Falta el nombre de alguno de los pasajeros.");
      return;
    }
    setError(null);
    onSubmit({
      pickupPointId: pickupPointId || null,
      roundTrip,
      seats,
      passengerNames: names.map((name) => name.trim()),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {(trip.description || trip.pickup_location) && (
        <Card className="p-4 text-sm text-foreground-muted">
          {trip.description && <RichText text={trip.description} />}
          {trip.pickup_location && (
            <div className="mt-3 flex items-start gap-1.5 text-xs">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <RichText text={trip.pickup_location} />
            </div>
          )}
        </Card>
      )}

      {trip.pickup_points.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-foreground">
            ¿Dónde te recogemos?
          </h3>
          <div className="mt-2 flex flex-col gap-2">
            {trip.pickup_points.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${pickupPointId === option.id
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-border bg-surface hover:bg-muted"
                  }`}
              >
                <input
                  type="radio"
                  name="pickup-point"
                  value={option.id}
                  checked={pickupPointId === option.id}
                  onChange={() => setPickupPointId(option.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary-500"
                />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-bold text-foreground">
                      {option.name}
                    </span>
                    <span className="font-bold text-foreground">
                      {money(seatPriceOf(trip, option, roundTrip), currency)}
                    </span>
                  </span>
                  {option.pickup_time && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-foreground-muted">
                      <Clock className="h-3 w-3" />
                      Pasamos {hhmm(option.pickup_time)}
                    </span>
                  )}
                  {option.details && (
                    <span className="mt-0.5 block text-xs text-foreground-muted">
                      {option.details}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {trip.round_trip_enabled && (
        <div>
          <h3 className="text-sm font-bold text-foreground">Tipo de viaje</h3>
          <Select
            value={roundTrip ? "round_trip" : "one_way"}
            onChange={(e) => setRoundTrip(e.target.value === "round_trip")}
            className="mt-2"
          >
            <option value="one_way">
              Solo ida · {money(seatPriceOf(trip, point, false), currency)}
            </option>
            <option value="round_trip">
              Ida y vuelta · {money(seatPriceOf(trip, point, true), currency)}
            </option>
          </Select>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-foreground">¿Cuántos asientos?</h3>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => changeSeats(seats - 1)}
            disabled={seats <= 1}
            aria-label="Un asiento menos"
            className="h-10 w-10 shrink-0 rounded-lg border border-border bg-surface text-lg font-bold text-foreground disabled:opacity-40"
          >
            −
          </button>
          <span className="w-10 text-center text-lg font-extrabold text-foreground">
            {seats}
          </span>
          <button
            type="button"
            onClick={() => changeSeats(seats + 1)}
            disabled={seats >= maxSeats}
            aria-label="Un asiento más"
            className="h-10 w-10 shrink-0 rounded-lg border border-border bg-surface text-lg font-bold text-foreground disabled:opacity-40"
          >
            +
          </button>
          <span className="text-xs text-foreground-muted">
            Máximo {maxSeats} por reserva
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground">
          Nombre de cada pasajero
        </h3>
        <p className="mt-0.5 text-xs text-foreground-muted">
          Es la lista que lleva el chofer.
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {names.map((name, index) => (
            <input
              key={index}
              type="text"
              value={name}
              onChange={(e) =>
                setNames((prev) => {
                  const copy = [...prev];
                  copy[index] = e.target.value;
                  return copy;
                })
              }
              className={sheetInputClasses}
              placeholder={index === 0 ? "Tu nombre" : `Pasajero ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <Card className="flex items-baseline justify-between p-4">
        <span className="text-sm text-foreground-muted">
          {seats} × {money(price, currency)}
        </span>
        <span className="text-lg font-extrabold text-foreground">
          {money(price * seats, currency)}
        </span>
      </Card>

      {deposit > 0 && (
        <p className="-mt-2 text-xs text-foreground-muted">
          Para guardarte el asiento se paga una seña de{" "}
          <strong className="text-foreground">
            {money(deposit * seats, currency)}
          </strong>
          . El resto se abona el día del viaje.
        </p>
      )}

      {error && <p className="text-sm text-danger-600">{error}</p>}

      <Button type="submit" variant="mesh-primary" className="w-full justify-center">
        Continuar
      </Button>
    </form>
  );
}
