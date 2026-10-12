"use client";

import { RecordPaymentSheet } from "@/components/organizations/RecordPaymentSheet";
import {
  Button,
  Card,
  Field,
  Select,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import {
  FOUNDER_LOCK_MONTHS,
  LICENSE_GRACE_DAYS,
  LICENSE_PHASE_LABEL,
  LICENSE_PLAN_INFO,
  LICENSE_PLANS,
  type LicensePhase,
  type LicensePlan,
  addLicenseDays,
  formatLicenseDay,
  formatUsd,
  isBillingPeriod,
  isLicensePlan,
  licenseDayOf,
  licenseMonthlyPrice,
} from "@/config/license-pricing";
import { useToast } from "@/hooks";
import {
  useOrganizationOptions,
  useUpdateLicenseBilling,
} from "@/hooks/useLicenseBilling.query";
import type { OrganizationWithLicenseStatus } from "@/types/organization";
import { CreditCard } from "lucide-react";
import { useState } from "react";

export interface LicensePlanCardProps {
  organization: OrganizationWithLicenseStatus;
  onChanged: () => void;
}

const APPOINTMENT_PLANS = LICENSE_PLANS.filter(
  (plan) => LICENSE_PLAN_INFO[plan].appointments
);

/**
 * Plan, founder price, referrer and owner WhatsApp of a business, and the
 * way to record a payment. Platform admin only: the database rejects these
 * changes from anyone else.
 */
export function LicensePlanCard({ organization, onChanged }: LicensePlanCardProps) {
  const toast = useToast();
  const updateBilling = useUpdateLicenseBilling(organization.id);
  const organizations = useOrganizationOptions(true);

  const savedPlan: LicensePlan = isLicensePlan(organization.license_plan)
    ? organization.license_plan
    : "personal";
  const phase = organization.license_phase as LicensePhase;
  const secondModule =
    organization.appointments_module_enabled && organization.trips_module_enabled;

  const [plan, setPlan] = useState<LicensePlan>(savedPlan);
  const [founder, setFounder] = useState(organization.license_founder);
  const [referredBy, setReferredBy] = useState(
    organization.referred_by_organization_id ?? ""
  );
  const [ownerPhone, setOwnerPhone] = useState(organization.owner_phone ?? "");
  const [showPayment, setShowPayment] = useState(false);

  const dirty =
    plan !== savedPlan ||
    founder !== organization.license_founder ||
    referredBy !== (organization.referred_by_organization_id ?? "") ||
    ownerPhone.trim() !== (organization.owner_phone ?? "");

  // The founder lock is running (or ran): the mark can no longer be changed
  const founderLocked = !!organization.founder_price_until;
  const founderActive =
    organization.license_founder &&
    (!organization.founder_price_until ||
      organization.founder_price_until >= licenseDayOf(new Date()));
  const referralCredited = !!organization.referral_credit_applied_at;

  const expiresOn = organization.license_end_date
    ? licenseDayOf(organization.license_end_date)
    : null;

  const handleSave = async () => {
    try {
      await updateBilling.mutateAsync({
        license_plan: plan,
        license_founder: founder,
        referred_by_organization_id: referredBy || null,
        owner_phone: ownerPhone.trim() || null,
      });
      toast.success("Plan actualizado");
      onChanged();
    } catch (error) {
      toast.error(
        "No se guardó",
        error instanceof Error ? error.message : undefined
      );
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-foreground-muted">
            <CreditCard className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">Plan y cobro</div>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">
              {LICENSE_PLAN_INFO[savedPlan].label}
              {secondModule ? " + segundo módulo" : ""} ·{" "}
              {formatUsd(
                licenseMonthlyPrice(savedPlan, {
                  founder: founderActive,
                  secondModule,
                })
              )}{" "}
              al mes{founderActive ? " (precio fundador)" : ""} ·{" "}
              {LICENSE_PHASE_LABEL[phase] ?? phase}
            </p>
          </div>
        </div>
        <Button variant="mesh-primary" onClick={() => setShowPayment(true)}>
          Registrar pago
        </Button>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-foreground-muted">
            Tiene acceso hasta
          </dt>
          <dd className="mt-0.5 font-semibold text-foreground">
            {phase === "pending"
              ? "Su primer pago"
              : expiresOn
                ? formatLicenseDay(expiresOn)
                : "Sin vencimiento"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-foreground-muted">
            Se bloquea el
          </dt>
          <dd className="mt-0.5 font-semibold text-foreground">
            {phase !== "pending" && expiresOn
              ? formatLicenseDay(addLicenseDays(expiresOn, LICENSE_GRACE_DAYS + 1))
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-foreground-muted">
            Precio fundador
          </dt>
          <dd className="mt-0.5 font-semibold text-foreground">
            {!organization.license_founder
              ? "No"
              : organization.founder_price_until
                ? `Hasta el ${formatLicenseDay(organization.founder_price_until)}`
                : `Sí, ${FOUNDER_LOCK_MONTHS} meses desde su primer pago`}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <Field
          label="Plan"
          hint={
            organization.appointments_module_enabled
              ? "El cambio aplica ya; el precio nuevo se cobra desde el siguiente pago."
              : "Un negocio que solo vende pasajes está siempre en el plan Pasajes."
          }
        >
          <Select
            value={plan}
            disabled={!organization.appointments_module_enabled}
            onChange={(e) => setPlan(e.target.value as LicensePlan)}
          >
            {(organization.appointments_module_enabled
              ? APPOINTMENT_PLANS
              : (["trips"] as LicensePlan[])
            ).map((option) => (
              <option key={option} value={option}>
                {LICENSE_PLAN_INFO[option].label} ·{" "}
                {formatUsd(LICENSE_PLAN_INFO[option].price)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="WhatsApp del dueño" hint="Ahí le llegan los avisos de cobro.">
          <input
            type="tel"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            className={inputClasses}
            placeholder="+5351234567"
          />
        </Field>

        <Field
          label="Recomendado por"
          hint={
            referralCredited
              ? "Ya se le sumaron los días a quien lo recomendó."
              : "Quien lo recomendó gana días cuando este negocio paga por primera vez."
          }
        >
          <Select
            value={referredBy}
            disabled={referralCredited}
            onChange={(e) => setReferredBy(e.target.value)}
          >
            <option value="">Nadie</option>
            {(organizations.data ?? [])
              .filter((option) => option.id !== organization.id)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
          </Select>
        </Field>

        <div>
          <label
            className={`flex items-center gap-2 pt-5 ${
              founderLocked ? "opacity-60" : "cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={founder}
              disabled={founderLocked}
              onChange={(e) => setFounder(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-primary-500"
            />
            <span className="text-sm text-foreground">Negocio fundador</span>
          </label>
          <p className="mt-1 text-[11px] text-foreground-subtle">
            {founderLocked
              ? "El precio fundador ya empezó a contar con su primer pago."
              : `Paga ${formatUsd(LICENSE_PLAN_INFO[plan].founderPrice)} en vez de ${formatUsd(LICENSE_PLAN_INFO[plan].price)} durante ${FOUNDER_LOCK_MONTHS} meses. Márcalo antes de su primer pago.`}
          </p>
        </div>
      </div>

      {dirty && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="mesh-primary"
            onClick={handleSave}
            disabled={updateBilling.isPending}
          >
            {updateBilling.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      )}

      <RecordPaymentSheet
        open={showPayment}
        onClose={() => setShowPayment(false)}
        organizationId={organization.id}
        organizationName={organization.name}
        defaultPeriod={
          isBillingPeriod(organization.billing_period)
            ? organization.billing_period
            : null
        }
        onRecorded={onChanged}
      />
    </Card>
  );
}
