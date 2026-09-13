"use client";

import { Button, Card, Field, Select } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { organizationModuleKeys } from "@/hooks/useOrganizationModules.query";
import { useToast } from "@/hooks";
import { fmtMoney } from "@/utils/format";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { useState } from "react";

/** The ones the businesses using this actually charge in. */
const CURRENCIES = [
  { code: "CUP", label: "Peso cubano (CUP)" },
  { code: "USD", label: "Dólar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "ARS", label: "Peso argentino (ARS)" },
  { code: "MXN", label: "Peso mexicano (MXN)" },
  { code: "COP", label: "Peso colombiano (COP)" },
  { code: "CLP", label: "Peso chileno (CLP)" },
  { code: "PEN", label: "Sol (PEN)" },
  { code: "DOP", label: "Peso dominicano (DOP)" },
  { code: "BRL", label: "Real (BRL)" },
];

export interface CurrencyCardProps {
  organizationId: string;
  currency: string;
}

/**
 * The currency the business charges in. It is a property of the organization,
 * not of each price, so every screen formats amounts the same way.
 */
export function CurrencyCard({ organizationId, currency }: CurrencyCardProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [value, setValue] = useState(currency || "USD");
  const [saving, setSaving] = useState(false);

  const canEdit = profile?.role === "admin" || profile?.role === "owner";
  const dirty = value !== currency;

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("organizations")
        .update({ currency: value })
        .eq("id", organizationId);
      if (error) throw error;
      await queryClient.invalidateQueries({
        queryKey: organizationModuleKeys.all,
      });
      toast.success("Moneda actualizada", `Ahora los precios se ven en ${value}`);
    } catch (error) {
      void Logger.error("Error updating organization currency", error, {
        organizationId,
      });
      toast.error("Error", "No se pudo cambiar la moneda");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-4 p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-foreground-muted">
          <Coins className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">
            Moneda en la que cobrás
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">
            Se usa en todos los precios de la app: servicios, viajes, señas y
            reportes. Cambiarla no convierte los montos, solo cambia cómo se
            muestran.
          </p>
        </div>
      </div>

      <div className="sm:max-w-md">
        <Field
          label="Moneda"
          hint={`Un precio de 8500 se ve así: ${fmtMoney(8500, undefined, value)}`}
        >
          <div className="flex items-center gap-2">
            <Select
              id="org-currency"
              wrapperClassName="min-w-0 flex-1"
              value={value}
              disabled={!canEdit || saving}
              onChange={(e) => setValue(e.target.value)}
              className="disabled:opacity-60"
            >
              {CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>

            {canEdit && (
              <Button
                variant="mesh-primary"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="shrink-0"
              >
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            )}
          </div>
        </Field>
      </div>
    </Card>
  );
}
