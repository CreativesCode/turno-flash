import type { PaymentMethod } from "@/services/appointment-payments.service";
import type { PaymentStatus } from "@/types/appointments";

/** Payment status of an appointment (appointments_with_details, 095). */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Sin pagar",
  partial: "Pago parcial",
  paid: "Pagado",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  other: "Otro",
};

/** The method as a payment shows it: "Otro" says which one. */
export function paymentMethodText(method: PaymentMethod, other: string | null): string {
  return method === "other" && other ? other : PAYMENT_METHOD_LABEL[method];
}
