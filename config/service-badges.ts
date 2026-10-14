import type { BadgeProps } from "@/components/ui";

/**
 * Optional label a business puts on a service (PRP-004). The keys are the
 * values allowed by services_badge_check (migration 085). A badge never
 * changes the order the owner chose.
 */
export const SERVICE_BADGES = {
  recommended: { label: "Recomendado", variant: "primary" },
  popular: { label: "Más popular", variant: "warning" },
  new: { label: "Nuevo", variant: "secondary" },
  offer: { label: "Oferta", variant: "danger" },
} as const satisfies Record<
  string,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
>;

export type ServiceBadgeKey = keyof typeof SERVICE_BADGES;

export const SERVICE_BADGE_KEYS = Object.keys(
  SERVICE_BADGES
) as ServiceBadgeKey[];

export function isServiceBadge(value: unknown): value is ServiceBadgeKey {
  return typeof value === "string" && value in SERVICE_BADGES;
}
