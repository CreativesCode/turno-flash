/**
 * Display-formatting helpers for currency, durations and time arithmetic.
 * Used by the redesigned UI atoms (StatusBadge, ApptRow, ServiceCard…) and
 * by appointment screens that need to add minutes to a HH:MM string.
 */

/**
 * Format a number as currency in es-AR locale by default.
 * Pass `locale` and `currency` to override (e.g. for multi-org support).
 */
export function fmtMoney(
  n: number | null | undefined,
  locale = "es-AR",
  currency = "ARS"
): string {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${n.toLocaleString(locale)}`;
  }
}

/**
 * Format a duration in minutes as a short string: 30 → "30 min", 90 → "1h 30m".
 */
export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Convert a "HH:MM" string to total minutes since 00:00.
 * Returns 0 if the input is malformed.
 */
export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Add `minutes` to a "HH:MM" string, returning a new "HH:MM".
 * Wraps past midnight (e.g. addMinutes("23:30", 60) → "00:30").
 */
export function addMinutes(time: string, minutes: number): string {
  const total = (timeToMinutes(time) + minutes + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
