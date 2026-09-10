"use client";

import { Card, KebabMenu } from "@/components/ui";
import type {
  LicenseStatus,
  OrganizationWithOwner,
} from "@/types/organization";
import { Building2, Eye, Trash2 } from "lucide-react";

/** Same threshold as the license banner (utils/license.ts). */
const EXPIRING_SOON_DAYS = 7;

const WARNING_CHIP =
  "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400";

export function getLicenseMeta(
  status: LicenseStatus,
  daysRemaining: number | null
): { label: string; className: string } {
  if (
    status === "active" &&
    daysRemaining !== null &&
    daysRemaining <= EXPIRING_SOON_DAYS
  ) {
    return { label: "Por vencer", className: WARNING_CHIP };
  }
  switch (status) {
    case "active":
      return {
        label: "Activa",
        className:
          "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
      };
    case "grace_period":
      return { label: "En gracia", className: WARNING_CHIP };
    case "expired":
      return {
        label: "Vencida",
        className:
          "bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400",
      };
    default:
      return {
        label: "Sin licencia",
        className: "bg-surface-2 text-foreground-muted",
      };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export interface OrganizationCardProps {
  org: OrganizationWithOwner;
  onViewDetails: (org: OrganizationWithOwner) => void;
  onDelete: (org: OrganizationWithOwner) => void;
}

export function OrganizationCard({
  org,
  onViewDetails,
  onDelete,
}: OrganizationCardProps) {
  const license = getLicenseMeta(org.license_status, org.days_remaining);
  const ownerName = org.owner
    ? org.owner.full_name || org.owner.email
    : "Sin dueño";
  const members = org.member_count ?? 0;

  return (
    <Card className="flex items-start gap-3 p-3.5 transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => onViewDetails(org)}
        aria-label={`Ver detalles de ${org.name}`}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
      >
        <div className="mesh-info flex size-10.5 shrink-0 items-center justify-center rounded-[10px] text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="min-w-0 truncate text-[15px] font-bold text-foreground">
              {org.name}
            </span>
            <span
              className={`rounded-full px-1.75 py-0.5 text-[10px] font-bold ${license.className}`}
            >
              {license.label}
            </span>
            {!org.is_active && (
              <span className="rounded-full border border-danger-600 px-1.75 py-px text-[10px] font-bold text-danger-600 dark:border-danger-400 dark:text-danger-300">
                Inactiva
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-foreground-muted">
            /{org.slug} · {ownerName} · {members}{" "}
            {members === 1 ? "miembro" : "miembros"}
          </div>
          <div className="mt-1 text-[11px] text-foreground-subtle">
            {org.license_end_date
              ? `Vence: ${formatDate(org.license_end_date)}`
              : "Sin vencimiento"}
          </div>
        </div>
      </button>

      <KebabMenu
        items={[
          {
            label: "Ver detalles",
            icon: <Eye className="h-3.5 w-3.5" />,
            onClick: () => onViewDetails(org),
          },
          {
            label: "Eliminar",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            danger: true,
            onClick: () => onDelete(org),
          },
        ]}
      />
    </Card>
  );
}
