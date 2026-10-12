/**
 * License Service
 * Plan, payments and referrals of a business. Everything here is for the
 * platform admin: the database checks it (RLS on license_payments, the
 * enforce_module_change_is_admin trigger and the admin check inside the RPCs).
 */

import type { BillingPeriod, LicensePlan } from "@/config/license-pricing";
import type { Database } from "@/types/database.types";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";

export type LicensePayment =
  Database["public"]["Tables"]["license_payments"]["Row"];
export type LicenseNotice =
  Database["public"]["Tables"]["license_notices"]["Row"];

/** What a payment charges and covers, computed by the database. */
export interface LicensePaymentQuote {
  license_plan: LicensePlan;
  billing_period: BillingPeriod;
  second_module: boolean;
  founder_price: boolean;
  monthly_usd: number;
  amount_usd: number;
  /** `YYYY-MM-DD`, Cuban calendar days */
  covered_from: string;
  covered_until: string;
  first_payment: boolean;
}

export interface LicensePaymentResult extends LicensePaymentQuote {
  payment_id: string;
  referral_days: number | null;
  referrer_name: string | null;
}

export interface LicenseBillingPatch {
  license_plan?: LicensePlan;
  license_founder?: boolean;
  referred_by_organization_id?: string | null;
  owner_phone?: string | null;
}

export interface OrganizationOption {
  id: string;
  name: string;
}

/** Messages for the errors the license triggers raise (migrations 073, 076). */
const LICENSE_ERRORS: Record<string, string> = {
  license_plan_too_small:
    "Ese plan admite menos profesionales de los que el negocio tiene activos. Desactiva algunos primero.",
  license_pending_needs_payment:
    "Este negocio está en preparación: empieza con su primer pago, no con fechas escritas a mano. Usa «Registrar pago».",
  license_trial_only_at_signup:
    "La prueba gratis solo se da al crear el negocio.",
  license_phase_pending_not_reenterable:
    "Un negocio no puede volver a «En preparación».",
  organizations_not_self_referred: "Un negocio no puede recomendarse a sí mismo.",
};

/** Readable message for a license error, or null when it is something else. */
export function licenseErrorMessage(message: string | undefined): string | null {
  if (!message) return null;
  const code = Object.keys(LICENSE_ERRORS).find((key) => message.includes(key));
  return code ? LICENSE_ERRORS[code] : null;
}

export class LicenseService {
  static async quote(
    organizationId: string,
    period: BillingPeriod
  ): Promise<LicensePaymentQuote> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("license_payment_quote", {
      p_organization_id: organizationId,
      p_billing_period: period,
    });
    if (error || !data) {
      void Logger.error("Error quoting license payment:", error);
      throw new Error("No pudimos calcular el pago. Inténtalo de nuevo.");
    }
    return data as unknown as LicensePaymentQuote;
  }

  static async recordPayment(
    organizationId: string,
    period: BillingPeriod,
    note: string
  ): Promise<LicensePaymentResult> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("record_license_payment", {
      p_organization_id: organizationId,
      p_billing_period: period,
      p_note: note,
    });
    if (error || !data) {
      void Logger.error("Error recording license payment:", error);
      throw new Error("No pudimos registrar el pago. Inténtalo de nuevo.");
    }
    return data as unknown as LicensePaymentResult;
  }

  static async listPayments(organizationId: string): Promise<LicensePayment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("license_payments")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) {
      void Logger.error("Error loading license payments:", error);
      throw new Error("No pudimos cargar los pagos.");
    }
    return data ?? [];
  }

  /** Latest WhatsApp notices written for a business. */
  static async listNotices(organizationId: string): Promise<LicenseNotice[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("license_notices")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) {
      void Logger.error("Error loading license notices:", error);
      throw new Error("No pudimos cargar los avisos.");
    }
    return data ?? [];
  }

  /** Plan, founder mark, referrer and owner phone of a business. */
  static async updateBilling(
    organizationId: string,
    patch: LicenseBillingPatch
  ): Promise<void> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("organizations")
      .update(patch)
      .eq("id", organizationId)
      .select("id");
    // RLS rejects silently: no rows back means nothing was saved
    if (error || !data?.length) {
      const known = licenseErrorMessage(error?.message);
      if (!known) void Logger.error("Error updating license billing:", error);
      throw new Error(known ?? "No pudimos guardar los cambios.");
    }
  }

  /** Every business, to pick who referred this one. */
  static async listOrganizationOptions(): Promise<OrganizationOption[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) {
      void Logger.error("Error loading organizations:", error);
      throw new Error("No pudimos cargar los negocios.");
    }
    return data ?? [];
  }

  /** Businesses this one referred, with whether its days were already granted. */
  static async listReferred(
    organizationId: string
  ): Promise<(OrganizationOption & { credited: boolean })[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, referral_credit_applied_at")
      .eq("referred_by_organization_id", organizationId)
      .order("name", { ascending: true });
    if (error) {
      void Logger.error("Error loading referred organizations:", error);
      throw new Error("No pudimos cargar los negocios recomendados.");
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      credited: !!row.referral_credit_applied_at,
    }));
  }
}
