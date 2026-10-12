"use client";

import { useMoney } from "@/hooks/useMoney";

import {
  Badge,
  KebabMenu,
  type KebabMenuItem,
  ListRow,
  TimeBlock,
} from "@/components/ui";
import { useRouter } from "next/navigation";
import type { TripWithOccupancy } from "@/types/trips";
import { Copy, Edit3, Eye, EyeOff, Share2, Users, XCircle } from "lucide-react";

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

/** "2026-09-22" -> "22 sep" in the business locale. */
function fmtDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es", {
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
  const router = useRouter();
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
    <ListRow
      leading={
        <TimeBlock
          time={fmtTime(trip.departure_time)}
          detail={fmtDate(trip.departure_date)}
        />
      }
      title={trip.title}
      titleAside={
        <span className="font-mono text-body font-medium tabular-nums text-foreground">
          {trip.price_per_seat > 0 ? money(trip.price_per_seat) : "—"}
        </span>
      }
      subtitle={`${trip.seats_taken}/${trip.total_seats} asientos · ${
        isFull ? "sin lugares" : `${trip.seats_left} libres`
      }`}
      trailing={canManage && <KebabMenu items={menuItems} />}
      dimmed={isCancelled}
      onClick={() => router.push(`/dashboard/trips/details?id=${trip.id}`)}
    >
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border-2"
        role="img"
        aria-label={`${occupancyPct}% ocupado`}
      >
        <span
          className={`block h-full rounded-full transition-[width] ${
            isFull ? "bg-warning-500" : "bg-primary"
          }`}
          style={{ width: `${occupancyPct}%` }}
        />
      </div>
      {(trip.pending_approval > 0 ||
        trip.requires_approval ||
        !trip.is_published ||
        isCancelled ||
        trip.deposit_per_seat > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {isCancelled && <Badge variant="danger">Cancelada</Badge>}
          {trip.pending_approval > 0 && !isCancelled && (
            <Badge variant="warning">{trip.pending_approval} por aprobar</Badge>
          )}
          {trip.requires_approval && trip.pending_approval === 0 && (
            <Badge variant="muted">Requiere aprobación</Badge>
          )}
          {!trip.is_published && !isCancelled && (
            <Badge variant="muted">Sin publicar</Badge>
          )}
          {trip.deposit_per_seat > 0 && (
            <Badge variant="muted">
              Anticipo {money(trip.deposit_per_seat)}
            </Badge>
          )}
        </div>
      )}
    </ListRow>
  );
}
