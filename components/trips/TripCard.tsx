"use client";

import { useMoney } from "@/hooks/useMoney";

import { Card, KebabMenu, RichText, type KebabMenuItem } from "@/components/ui";
import Link from "next/link";
import type { TripWithOccupancy } from "@/types/trips";
import {
  Bus,
  CalendarDays,
  Clock,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  MapPin,
  Share2,
  Users,
  XCircle,
} from "lucide-react";

export interface TripCardProps {
  trip: TripWithOccupancy;
  canManage: boolean;
  onEdit: (trip: TripWithOccupancy) => void;
  onOpenPassengers: (trip: TripWithOccupancy) => void;
  onTogglePublished: (trip: TripWithOccupancy) => void;
  onDuplicate: (trip: TripWithOccupancy) => void;
  onShare: (trip: TripWithOccupancy) => void;
  onCancel: (trip: TripWithOccupancy) => void;
}

const chipClasses = {
  warning:
    "rounded-full border border-warning-600 bg-warning-50 px-2 py-0.5 text-[11px] font-bold text-warning-600 dark:border-warning-400 dark:bg-warning-900/20 dark:text-warning-300",
  danger:
    "rounded-full border border-danger-600 bg-danger-50 px-2 py-0.5 text-[11px] font-bold text-danger-600 dark:border-danger-400 dark:bg-danger-900/20 dark:text-danger-300",
  muted:
    "rounded-full border border-border-2 bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground-muted",
};

/** "2026-09-22" -> "mar 22 sep" in the business locale. */
function fmtDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "08:30:00" -> "08:30" */
function fmtTime(time: string | null): string {
  return time ? time.slice(0, 5) : "";
}

export function TripCard({
  trip,
  canManage,
  onEdit,
  onOpenPassengers,
  onTogglePublished,
  onDuplicate,
  onShare,
  onCancel,
}: TripCardProps) {
  const { format: money } = useMoney();
  const isCancelled = !!trip.cancelled_at;
  const isFull = trip.seats_left === 0;
  const occupancyPct = Math.min(
    Math.round((trip.seats_taken / trip.total_seats) * 100),
    100
  );

  const menuItems: KebabMenuItem[] = [
    {
      label: "Ver pasajeros",
      onClick: () => onOpenPassengers(trip),
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: "Editar",
      onClick: () => onEdit(trip),
      icon: <Edit3 className="h-4 w-4" />,
    },
    {
      label: trip.is_published ? "Quitar de la página" : "Publicar",
      onClick: () => onTogglePublished(trip),
      icon: trip.is_published ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      ),
      disabled: isCancelled,
    },
    {
      label: "Compartir",
      onClick: () => onShare(trip),
      icon: <Share2 className="h-4 w-4" />,
      disabled: isCancelled,
    },
    {
      label: "Duplicar",
      onClick: () => onDuplicate(trip),
      icon: <Copy className="h-4 w-4" />,
    },
    {
      label: "Cancelar salida",
      onClick: () => onCancel(trip),
      icon: <XCircle className="h-4 w-4" />,
      danger: true,
      disabled: isCancelled,
    },
  ];

  return (
    <Card className="relative flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white"
        >
          <Bus className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-foreground">
              {trip.title}
            </h3>
            <div className="whitespace-nowrap text-base font-extrabold tracking-tight text-foreground">
              {trip.price_per_seat > 0 ? money(trip.price_per_seat) : "—"}
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-foreground-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {fmtDate(trip.departure_date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtTime(trip.departure_time)}
              {trip.return_time ? ` – ${fmtTime(trip.return_time)}` : ""}
            </span>
            {trip.pickup_location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{trip.pickup_location}</span>
              </span>
            )}
          </div>

          {trip.description && (
            <p className="mt-1 line-clamp-2 text-xs text-foreground-muted">
              <RichText text={trip.description} />
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {trip.deposit_per_seat > 0 && (
              <span className={chipClasses.muted}>
                Anticipo {money(trip.deposit_per_seat)} por asiento
              </span>
            )}
            {trip.requires_approval && (
              <span className={chipClasses.warning}>Requiere aprobación</span>
            )}
            {!trip.is_published && !isCancelled && (
              <span className={chipClasses.muted}>Sin publicar</span>
            )}
            {isFull && !isCancelled && (
              <span className={chipClasses.warning}>Completo</span>
            )}
            {isCancelled && (
              <span className={chipClasses.danger}>Cancelada</span>
            )}
          </div>
        </div>

        {canManage && <KebabMenu items={menuItems} />}
      </div>

      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <Link
            href={`/dashboard/trips/details?id=${trip.id}`}
            className="inline-flex items-center gap-1.5 text-foreground-muted transition-colors hover:text-foreground"
          >
            <Users className="h-3.5 w-3.5" />
            {trip.seats_taken} de {trip.total_seats} asientos
          </Link>
          <span
            className={
              isFull
                ? "text-warning-600 dark:text-warning-300"
                : "text-primary-700 dark:text-primary-400"
            }
          >
            {isFull ? "Sin lugares" : `${trip.seats_left} libres`}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border-2"
          role="img"
          aria-label={`${occupancyPct}% ocupado`}
        >
          <span
            className={`block h-full rounded-full transition-[width] ${
              isFull ? "bg-warning-500" : "bg-primary-500"
            }`}
            style={{ width: `${occupancyPct}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
