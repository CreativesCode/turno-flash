import { BUSINESS_HOURS } from "@/config/constants";

/** Pair of hour rows (0-23) the Day/Week calendar draws: first and last, inclusive. */
export type HourRange = readonly [startHour: number, endHour: number];

export const DEFAULT_HOUR_RANGE: HourRange = [
  BUSINESS_HOURS.START_HOUR,
  BUSINESS_HOURS.END_HOUR,
];

/**
 * Widens the configured range so every appointment of the view stays visible.
 *
 * The business picks its hours in Ajustes (business_settings.calendar_*_hour),
 * but an appointment created before the change, or outside the usual hours,
 * must never disappear from the grid. One row covers HH:00 to HH:59, so an
 * appointment ending at 15:00 sharp only needs the 14 row.
 */
export function fitHourRange(
  [startHour, endHour]: HourRange,
  appointments: ReadonlyArray<{ start_time: string; end_time: string }>
): HourRange {
  let start = startHour;
  let end = endHour;
  for (const appt of appointments) {
    const sH = Number(appt.start_time.slice(0, 2));
    const [eH, eM] = appt.end_time.split(":").map(Number);
    if (Number.isNaN(sH) || Number.isNaN(eH)) continue;
    start = Math.min(start, sH);
    end = Math.max(end, Math.min(23, eM > 0 ? eH : eH - 1));
  }
  return start === startHour && end === endHour ? [startHour, endHour] : [start, end];
}
