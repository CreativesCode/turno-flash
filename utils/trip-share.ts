import type { TripWithOccupancy } from "@/types/trips";
import { fmtMoney } from "@/utils/format";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function longDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(day)} de ${MONTHS[Number(month) - 1] ?? ""}`;
}

function hhmm(time: string | null): string {
  return time ? time.slice(0, 5) : "";
}

/**
 * The departure written out as a WhatsApp message, the way the agencies post
 * it in their groups: title, day, stops with their prices and times, deposit,
 * and the link to book.
 *
 * It uses the same marks the app's editor uses (*bold*, _italic_), so what the
 * business typed in the description travels unchanged.
 */
export function tripShareText(
  trip: TripWithOccupancy,
  options: { currency: string; bookingUrl?: string | null }
): string {
  const { currency, bookingUrl } = options;
  const money = (amount: number) => fmtMoney(amount, undefined, currency);
  const lines: string[] = [];

  lines.push(`🚌 *${trip.title}*`);
  lines.push(
    `🗓️ ${longDate(trip.departure_date)} · sale ${hhmm(trip.departure_time)}${
      trip.return_time ? ` · vuelve ${hhmm(trip.return_time)}` : ""
    }`
  );

  if (trip.description) lines.push("", trip.description);

  if (trip.pickup_points.length > 0) {
    lines.push("", "*Dónde te recogemos y cuánto sale*");
    for (const point of trip.pickup_points) {
      const time = point.pickup_time ? ` (${hhmm(point.pickup_time)})` : "";
      const roundTrip =
        trip.round_trip_enabled
          ? ` · ida y vuelta ${money(
              point.price_round_trip ?? trip.price_round_trip ?? point.price_per_seat
            )}`
          : "";
      lines.push(`• ${point.name}${time}: ${money(point.price_per_seat)}${roundTrip}`);
    }
  } else {
    lines.push("", `Precio: *${money(trip.price_per_seat)}* por asiento`);
    if (trip.round_trip_enabled) {
      lines.push(
        `Ida y vuelta: *${money(trip.price_round_trip ?? trip.price_per_seat)}*`
      );
    }
    if (trip.pickup_location) lines.push("", `📍 ${trip.pickup_location}`);
  }

  if (trip.deposit_per_seat > 0) {
    lines.push(
      "",
      `💵 Seña de ${money(trip.deposit_per_seat)} por asiento para reservar.`
    );
  }

  lines.push("", `💺 Quedan ${trip.seats_left} de ${trip.total_seats} asientos.`);

  if (trip.driver_name || trip.vehicle_description) {
    lines.push(
      `🚍 ${[trip.vehicle_description, trip.driver_name].filter(Boolean).join(" · ")}`
    );
  }

  if (bookingUrl) lines.push("", `Reservá acá: ${bookingUrl}`);

  return lines.join("\n");
}

/** wa.me link that opens WhatsApp with the message already written. */
export function tripShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
