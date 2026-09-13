"use client";

import { Button, Field, RichTextEditor } from "@/components/ui";
import { useToast } from "@/hooks";
import { useOrganizationBasics } from "@/hooks/useBookingSetup.query";
import { useTripsQuery } from "@/hooks";
import { getSiteUrl } from "@/utils/metadata";
import { Copy, ExternalLink, MessageCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";

const linkButtonClasses =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted";

export interface TripBookingDetailsProps {
  organizationId: string;
  enabled: boolean;
  depositInstructions: string;
  holdHours: number;
  onChange: (patch: {
    deposit_instructions?: string;
    seat_booking_hold_hours?: number;
  }) => void;
}

/**
 * Everything the seat booking page needs from the business: its link, how the
 * customer is told to pay the deposit, and how long a seat is held for.
 *
 * The instructions are the text the passenger reads right after booking ("card
 * number, send the receipt to…"), which is why it is the same rich editor as
 * the trip description: it has to be pasteable into WhatsApp.
 */
export function TripBookingDetails({
  organizationId,
  enabled,
  depositInstructions,
  holdHours,
  onChange,
}: TripBookingDetailsProps) {
  const { data: basics } = useOrganizationBasics(organizationId);
  const { trips } = useTripsQuery();
  const toast = useToast();

  if (!basics) return null;

  // Always the public web domain: inside the native app window.location is localhost
  const link = `${getSiteUrl()}/trips?b=${basics.slug}`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Reserva tu asiento: ${link}`
  )}`;
  const published = trips.filter(
    (trip) => trip.is_published && !trip.cancelled_at
  );

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
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkButtonClasses}
        >
          <MessageCircle className="h-4 w-4" />
          Compartir
        </a>
        {enabled && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={linkButtonClasses}
          >
            <ExternalLink className="h-4 w-4" />
            Ver página
          </a>
        )}
      </div>

      {!enabled && (
        <p className="text-[11px] text-foreground-subtle">
          Activa la página y guarda los cambios para que el link empiece a
          funcionar.
        </p>
      )}

      {enabled && published.length === 0 && (
        <div className="flex items-start gap-1.5 rounded-lg bg-warning-50 p-3 text-xs text-warning-800 dark:bg-warning-900/20 dark:text-warning-400">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No tienes ninguna salida publicada, así que el cliente va a ver la
            página vacía.{" "}
            <Link
              href="/dashboard/trips"
              className="font-semibold underline underline-offset-2"
            >
              Cargar una salida
            </Link>
          </span>
        </div>
      )}

      <Field
        label="Cómo se paga el anticipo"
        hint="Se lo mostramos al cliente apenas reserva y en el WhatsApp de confirmación."
      >
        <RichTextEditor
          label="Instrucciones de pago"
          value={depositInstructions}
          onChange={(value) => onChange({ deposit_instructions: value })}
          rows={4}
          placeholder={
            "*Transfiere el anticipo* a la tarjeta 9200 1299 1234 5678 (Juan Pérez)." +
            "\n" +
            "Envíanos el comprobante por WhatsApp y te confirmamos el asiento."
          }
        />
      </Field>

      <Field
        label="Horas para pagar el anticipo"
        hint="Pasado ese tiempo sin pagar, el asiento vuelve a quedar libre."
      >
        <input
          type="number"
          min={1}
          max={168}
          value={holdHours}
          onChange={(e) =>
            onChange({
              seat_booking_hold_hours: Number(e.target.value) || 1,
            })
          }
          className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
        />
      </Field>
    </div>
  );
}
