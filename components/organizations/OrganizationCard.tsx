"use client";

import { Badge, IconTile, KebabMenu, ListRow } from "@/components/ui";
import type {
  LicenseStatus,
  OrganizationWithOwner,
} from "@/types/organization";
import { Building2, Eye, Trash2 } from "lucide-react";

/** Same threshold as the license banner (utils/license.ts). */
const EXPIRING_SOON_DAYS = 7;

const WARNING_CHIP =
  "bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-400";

export function getLicenseMeta(
  status: LicenseStatus,
  daysRemaining: number | null,
  phase?: string | null
): { label: string; className: string } {
  // A pending business is blocked until its first payment, not expired
  if (phase === "pending") {
    return { label: "En preparación", className: WARNING_CHIP };
  }
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
          "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-400",
      };
    case "grace_period":
      return { label: "En margen de pago", className: WARNING_CHIP };
    case "expired":
      return {
        label: "Vencida",
        className:
          "bg-danger-100 text-danger-600 dark:bg-danger-900 dark:text-danger-400",
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
  const license = getLicenseMeta(
    org.license_status,
    org.days_remaining,
    org.license_phase
  );
  const ownerName = org.owner
    ? org.owner.full_name || org.owner.email
    : "Sin dueño";
  const members = org.member_count ?? 0;

  return (
    <ListRow
      leading={
        <IconTile>
          <Building2 />
        </IconTile>
      }
      title={org.name}
      subtitle={`/${org.slug} · ${ownerName} · ${members} ${
        members === 1 ? "miembro" : "miembros"
      }`}
      trailing={
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
      }
      onClick={() => onViewDetails(org)}
    >
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge className={license.className}>{license.label}</Badge>
        {!org.is_active && <Badge variant="danger">Inactiva</Badge>}
        <span className="text-caption text-foreground-subtle">
          {org.license_end_date
            ? `Vence ${formatDate(org.license_end_date)}`
            : "Sin vencimiento"}
        </span>
      </div>
    </ListRow>
  );
}
