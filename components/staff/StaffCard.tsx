"use client";

import { Avatar, Badge, KebabMenu, ListRow } from "@/components/ui";
import type { StaffMember } from "@/types/appointments";
import { CalendarClock, Edit3 } from "lucide-react";

export interface StaffCardProps {
  member: StaffMember;
  canManage: boolean;
  onEdit: (s: StaffMember) => void;
  onSchedule: (s: StaffMember) => void;
  onToggleActive: (s: StaffMember) => void;
  onDelete: (s: StaffMember) => void;
}

export function StaffCard({
  member,
  canManage,
  onEdit,
  onSchedule,
  onToggleActive,
  onDelete,
}: StaffCardProps) {
  const fullName = `${member.first_name} ${member.last_name}`.trim();
  const color = member.color ?? "#3b82f6";
  const isBookable = member.is_bookable ?? false;
  const acceptsOnline = member.accepts_online_bookings ?? false;
  const isActive = member.is_active ?? false;

  const details = [
    ...(member.specialties ?? []),
    isBookable ? null : "No reservable",
    acceptsOnline ? "Reserva online" : null,
  ].filter(Boolean);

  return (
    <ListRow
      leading={
        <div className="relative">
          <Avatar name={fullName} color={color} size={40} />
          {isBookable && isActive && (
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-surface"
            />
          )}
        </div>
      }
      title={member.nickname ? `${fullName} · ${member.nickname}` : fullName}
      titleAside={!isActive && <Badge variant="muted">Inactivo</Badge>}
      subtitle={details.join(" · ") || undefined}
      trailing={
        canManage && (
          <KebabMenu
            items={[
              {
                label: "Editar",
                icon: <Edit3 className="h-3.5 w-3.5" />,
                onClick: () => onEdit(member),
              },
              {
                label: "Horario y servicios",
                icon: <CalendarClock className="h-3.5 w-3.5" />,
                onClick: () => onSchedule(member),
              },
              {
                label: isActive ? "Pausar" : "Reactivar",
                onClick: () => onToggleActive(member),
              },
              {
                label: "Eliminar",
                danger: true,
                onClick: () => onDelete(member),
              },
            ]}
          />
        )
      }
      dimmed={!isActive}
      onClick={canManage ? () => onEdit(member) : undefined}
    />
  );
}
