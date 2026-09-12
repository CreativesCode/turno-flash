"use client";

import { Avatar, Card, KebabMenu } from "@/components/ui";
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

  return (
    <Card className="flex items-start gap-3 p-3.5">
      <div className="relative">
        <Avatar name={fullName} color={color} size={48} />
        {isBookable && isActive && (
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-primary-500"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-foreground">{fullName}</span>
          {member.nickname && (
            <span className="text-xs text-foreground-muted">
              · {member.nickname}
            </span>
          )}
        </div>

        {member.specialties && member.specialties.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {member.specialties.map((sp) => (
              <span
                key={sp}
                className="rounded-full border border-border bg-surface-2 px-1.5 py-px text-[10px] font-semibold text-foreground-muted"
              >
                {sp}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-foreground-muted">
          <span className="inline-flex items-center gap-1">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: isBookable
                  ? "var(--color-primary-500)"
                  : "var(--color-foreground-subtle)",
              }}
            />
            {isBookable ? "Reservable" : "No reservable"}
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: acceptsOnline
                  ? "var(--color-info-500)"
                  : "var(--color-foreground-subtle)",
              }}
            />
            {acceptsOnline ? "Online sí" : "Online no"}
          </span>
          {!isActive && (
            <span className="rounded-full border border-danger-600 bg-danger-50 px-2 py-0.5 text-[11px] font-bold text-danger-600 dark:border-danger-400 dark:bg-danger-900/20 dark:text-danger-300">
              Inactivo
            </span>
          )}
        </div>
      </div>

      {canManage && (
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
      )}
    </Card>
  );
}
