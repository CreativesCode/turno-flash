import { fmtMoney } from "@/utils/format";
import { useCallback } from "react";
import { useOrganizationModules } from "./useOrganizationModules.query";

/**
 * Formats amounts in the currency the organization charges in (migration 039).
 * Every screen that shows money inside a business should use this instead of
 * calling fmtMoney directly, so a business that charges in CUP never sees its
 * prices rendered as another currency.
 */
export function useMoney() {
  const { modules } = useOrganizationModules();
  const currency = modules.currency || "USD";

  const format = useCallback(
    (amount: number | null | undefined) => fmtMoney(amount, undefined, currency),
    [currency]
  );

  return { format, currency };
}
