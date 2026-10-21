/**
 * Deposit a service asks for, the same way the database computes it
 * (service_deposit_amount, migration 090): a fixed amount, or a percentage of
 * the price rounded to a whole number. null = no deposit.
 */
export function serviceDepositAmount(service: {
  price?: number | null;
  deposit_type?: string | null;
  deposit_value?: number | null;
}): number | null {
  const value = service.deposit_value ?? 0;
  let amount = 0;
  if (service.deposit_type === "fixed") amount = value;
  if (service.deposit_type === "percent") {
    amount = Math.round(((service.price ?? 0) * value) / 100);
  }
  return amount > 0 ? amount : null;
}

export type DepositAction = "verify" | "waive" | "refund";

export type DepositStatus =
  | "pending"
  | "requested"
  | "paid"
  | "verified"
  | "cancelled"
  | "refunded";

/** What each deposit status means for the owner. */
export const DEPOSIT_STATUS_LABEL: Record<DepositStatus, string> = {
  pending: "Pendiente",
  requested: "Instrucciones enviadas",
  paid: "El cliente avisó que pagó",
  verified: "Recibido",
  cancelled: "Cancelado",
  refunded: "Devuelto",
};

/** The deposit is still owed: the appointment waits for it. */
export function depositOpen(status: string | null | undefined): boolean {
  return status === "pending" || status === "requested" || status === "paid";
}

/** A deposit for a given price, the way deposit_amount_for (093) computes it. */
export function depositFor(
  type: string | null | undefined,
  value: number | null | undefined,
  price: number | null | undefined
): number | null {
  return serviceDepositAmount({ deposit_type: type, deposit_value: value, price });
}

/** The deadline passed and the deposit is still owed. */
export function depositOverdue(
  status: string | null | undefined,
  dueAt: string | null | undefined
): boolean {
  return depositOpen(status) && !!dueAt && new Date(dueAt).getTime() < Date.now();
}

/** ISO date → value of a `datetime-local` input, in local time (never toISOString). */
export function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** Value of a `datetime-local` input (local time) → ISO, or null when empty. */
export function fromLocalDateTimeInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
