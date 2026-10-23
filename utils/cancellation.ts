/** Why an appointment was cancelled (appointments.cancellation_category, 097). */
export const CANCELLATION_CATEGORIES = ["customer", "business", "deposit_unpaid", "other"] as const;
export type CancellationCategory = (typeof CANCELLATION_CATEGORIES)[number];

export const CANCELLATION_LABELS: Record<CancellationCategory, string> = {
  customer: "El cliente canceló",
  business: "Canceló el negocio",
  deposit_unpaid: "No pagó el anticipo",
  other: "Otro",
};

/** "El cliente canceló" or, for "other", the text the user wrote. */
export function cancellationLabel(
  category: string | null | undefined,
  reason: string | null | undefined
): string | null {
  if (category === "other") return reason?.trim() || CANCELLATION_LABELS.other;
  if (category && category in CANCELLATION_LABELS) {
    return CANCELLATION_LABELS[category as CancellationCategory];
  }
  // Cancelled before 097: only the free text, if any
  return reason?.trim() || null;
}
