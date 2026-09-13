"use client";

import { useMoney } from "@/hooks/useMoney";

import type { TripWithOccupancy } from "@/types/trips";

export interface PassengerPrintRow {
  passenger: string;
  bookedBy: string;
  phone: string;
  bookingNumber: string;
  status: string;
  /** "Solo ida" / "Ida y vuelta", printed under the status. */
  tripType: string;
  deposit: string;
  depositEach: number;
  priceEach: number;
  paidEach: number;
  /** What the driver has to collect from this passenger. */
  pendingEach: number;
  extra: string;
}

export interface PassengerPrintSheetProps {
  organizationName: string;
  trip: TripWithOccupancy;
  rows: PassengerPrintRow[];
}

/**
 * The driver's sheet. Hidden on screen and laid out only for print, so
 * "Imprimir → Guardar como PDF" produces the same table as the CSV with the
 * business name and the departure details on top.
 */
export function PassengerPrintSheet({
  organizationName,
  trip,
  rows,
}: PassengerPrintSheetProps) {
  const { format: money } = useMoney();
  const totalPrice = rows.reduce((sum, row) => sum + row.priceEach, 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.paidEach, 0);
  const totalPending = rows.reduce((sum, row) => sum + row.pendingEach, 0);
  const printedAt = new Date().toLocaleString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="hidden print:block print:text-black">
      <header className="border-b-2 border-black pb-2">
        <h1 className="text-lg font-bold">{organizationName || "Lista de pasajeros"}</h1>
        <p className="text-base font-semibold">{trip.title}</p>
        <p className="text-xs">
          Salida: {trip.departure_date} a las {trip.departure_time.slice(0, 5)}
          {trip.return_time ? ` · Regreso: ${trip.return_time.slice(0, 5)}` : ""}
        </p>
        {(trip.driver_name || trip.vehicle_description) && (
          <p className="text-xs">
            {trip.vehicle_description}
            {trip.vehicle_description && trip.driver_name ? " · " : ""}
            {trip.driver_name ? `Chofer: ${trip.driver_name}` : ""}
            {trip.driver_phone ? ` (${trip.driver_phone})` : ""}
          </p>
        )}
        {trip.pickup_location && (
          <p className="whitespace-pre-line text-xs">
            Punto de encuentro: {trip.pickup_location}
          </p>
        )}
        <p className="text-xs">
          {rows.length} pasajero{rows.length === 1 ? "" : "s"} · {trip.total_seats}{" "}
          asientos en total · impreso el {printedAt}
        </p>
      </header>

      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1 pr-2 font-bold">#</th>
            <th className="py-1 pr-2 font-bold">Pasajero</th>
            <th className="py-1 pr-2 font-bold">Reservó</th>
            <th className="py-1 pr-2 font-bold">Teléfono</th>
            <th className="py-1 pr-2 font-bold">Reserva</th>
            <th className="py-1 pr-2 font-bold">Estado</th>
            <th className="py-1 pr-2 font-bold">Extra</th>
            <th className="py-1 pr-2 text-right font-bold">Total</th>
            <th className="py-1 pr-2 text-right font-bold">Pagó</th>
            <th className="py-1 text-right font-bold">A cobrar</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.bookingNumber}-${index}`} className="border-b border-gray-300">
              <td className="py-1 pr-2">{index + 1}</td>
              <td className="py-1 pr-2">{row.passenger}</td>
              <td className="py-1 pr-2">{row.bookedBy}</td>
              <td className="py-1 pr-2">{row.phone}</td>
              <td className="py-1 pr-2">{row.bookingNumber}</td>
              <td className="py-1 pr-2">
                {row.status}
                <span className="block text-[10px]">{row.tripType}</span>
              </td>
              <td className="py-1 pr-2">{row.extra}</td>
              <td className="py-1 pr-2 text-right">{money(row.priceEach)}</td>
              <td className="py-1 pr-2 text-right">{money(row.paidEach)}</td>
              <td
                className={`py-1 text-right ${
                  row.pendingEach > 0 ? "font-bold" : ""
                }`}
              >
                {money(row.pendingEach)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black font-bold">
            <td className="py-1 pr-2" colSpan={7}>
              Totales
            </td>
            <td className="py-1 pr-2 text-right">{money(totalPrice)}</td>
            <td className="py-1 pr-2 text-right">{money(totalPaid)}</td>
            <td className="py-1 text-right">{money(totalPending)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-2 text-[11px] font-bold">
        A cobrar en el ómnibus: {money(totalPending)}
      </p>

      <p className="mt-6 text-[10px]">
        Firma del chofer: ______________________________
      </p>
    </div>
  );
}
