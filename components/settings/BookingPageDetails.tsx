"use client";

import { Button } from "@/components/ui";
import { useToast } from "@/hooks";
import {
  useBookingReadiness,
  useOrganizationBasics,
} from "@/hooks/useBookingSetup.query";
import { getSiteUrl } from "@/utils/metadata";
import { Copy, ExternalLink, MessageCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";

const linkButtonClasses =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted";

export interface BookingPageDetailsProps {
  organizationId: string;
  enabled: boolean;
}

/**
 * Shareable link of the public booking page plus a readiness check: which
 * staff members will not appear online and why.
 */
export function BookingPageDetails({ organizationId, enabled }: BookingPageDetailsProps) {
  const { data: basics } = useOrganizationBasics(organizationId);
  const { data: staff = [], isLoading } = useBookingReadiness(organizationId);
  const toast = useToast();

  if (!basics) return null;

  // Always the public web domain: inside the native app window.location is localhost
  const link = `${getSiteUrl()}/book?b=${basics.slug}`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Reserva tu turno online: ${link}`
  )}`;
  const ready = staff.filter((s) => s.issues.length === 0);
  const pending = staff.filter((s) => s.issues.length > 0);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar", link);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="truncate rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-foreground">
        {link}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={copyLink}>
          <Copy className="h-4 w-4" />
          Copiar link
        </Button>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className={linkButtonClasses}>
          <MessageCircle className="h-4 w-4" />
          Compartir
        </a>
        {enabled && (
          <a href={link} target="_blank" rel="noopener noreferrer" className={linkButtonClasses}>
            <ExternalLink className="h-4 w-4" />
            Ver página
          </a>
        )}
      </div>

      {!enabled && (
        <p className="text-[11px] text-foreground-subtle">
          Activa la página y guarda los cambios para que el link empiece a funcionar.
        </p>
      )}

      {!isLoading && (
        <div
          className={`rounded-lg p-3 text-xs ${
            ready.length === 0
              ? "bg-warning-50 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400"
              : "bg-surface-2 text-foreground-muted"
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold">
            {ready.length === 0 && <TriangleAlert className="h-3.5 w-3.5" />}
            {ready.length === 0
              ? "Todavía no aparecerá ningún profesional en tu página."
              : `${ready.length} ${ready.length === 1 ? "profesional disponible" : "profesionales disponibles"} online.`}
          </div>
          {pending.length > 0 && (
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {pending.map((s) => (
                <li key={s.id}>
                  <span className="font-semibold">{s.name}</span>: {s.issues.join(", ")}
                </li>
              ))}
            </ul>
          )}
          {pending.length > 0 && (
            <Link
              href="/dashboard/staff"
              className="mt-2 inline-block font-semibold text-primary-700 hover:underline dark:text-primary-400"
            >
              Configurar en Profesionales →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
