import { Badge } from "@/components/ui";
import { SERVICE_BADGES, isServiceBadge } from "@/config/service-badges";

/** The optional label of a service ("Recomendado"…); nothing if unset. */
export function ServiceBadge({
  badge,
  className = "",
}: {
  badge: string | null | undefined;
  className?: string;
}) {
  if (!isServiceBadge(badge)) return null;
  const { label, variant } = SERVICE_BADGES[badge];
  return (
    <Badge variant={variant} className={`h-5 px-2 ${className}`}>
      {label}
    </Badge>
  );
}
