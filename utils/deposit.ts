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
