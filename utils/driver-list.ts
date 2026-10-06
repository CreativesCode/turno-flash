import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { formatDateForDisplay } from "./date";

/** "Parque Central · 07:30", or "" when the passenger boards at the meeting point. */
export function pickupLabel(
  point: { name: string; pickup_time: string | null } | null | undefined
): string {
  if (!point) return "";
  return point.pickup_time
    ? `${point.name} · ${point.pickup_time.slice(0, 5)}`
    : point.name;
}

/** Departure date as the driver reads it: "lunes, 12 de octubre de 2026". */
export function departureDateLabel(date: string): string {
  return formatDateForDisplay(date);
}

/**
 * Plain-text driver list, ready for a WhatsApp chat (P1-16): who boards,
 * where, their phone and what to collect from each passenger.
 */
export function driverListText(input: {
  organizationName: string;
  title: string;
  date: string;
  time: string;
  driver?: string | null;
  rows: { passenger: string; pickup: string; phone: string; pendingEach: number }[];
  money: (amount: number) => string;
}): string {
  const total = input.rows.reduce((sum, row) => sum + row.pendingEach, 0);
  const lines = [
    `*${input.organizationName || "Lista de pasajeros"}* · ${input.title}`,
    `Salida: ${departureDateLabel(input.date)} a las ${input.time.slice(0, 5)}`,
    ...(input.driver ? [`Chofer: ${input.driver}`] : []),
    "",
    ...input.rows.map((row, index) =>
      [
        `${index + 1}. ${row.passenger}`,
        row.pickup,
        row.phone,
        row.pendingEach > 0 ? `cobrar ${input.money(row.pendingEach)}` : "pagado",
      ]
        .filter(Boolean)
        .join(" · ")
    ),
    "",
    `A cobrar en el ómnibus: ${input.money(total)}`,
  ];
  return lines.join("\n");
}

/**
 * Native share sheet in the app; the Web Share API in the browser; a
 * WhatsApp link where neither exists.
 */
export async function shareText(text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Share.share({ text });
    return;
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (error) {
      // The user closed the sheet: nothing else to do
      if ((error as DOMException)?.name === "AbortError") return;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
