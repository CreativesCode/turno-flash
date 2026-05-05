"use client";

import { Avatar, Card } from "@/components/ui";
import type { StaffMember } from "@/types/appointments";
import { Edit3, MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface StaffCardProps {
  member: StaffMember;
  canManage: boolean;
  onEdit: (s: StaffMember) => void;
  onToggleActive: (s: StaffMember) => void;
  onDelete: (s: StaffMember) => void;
}

export function StaffCard({
  member,
  canManage,
  onEdit,
  onToggleActive,
  onDelete,
}: StaffCardProps) {
  const fullName = `${member.first_name} ${member.last_name}`.trim();
  const color = member.color ?? "#3b82f6";
  const isBookable = member.is_bookable ?? false;
  const acceptsOnline = member.accepts_online_bookings ?? false;
  const isActive = member.is_active ?? false;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

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
            <span className="rounded-full border border-danger-800 bg-danger-50 px-2 py-0.5 text-[11px] font-bold text-danger-800 dark:border-danger-300 dark:bg-danger-900/20 dark:text-danger-200">
              Inactivo
            </span>
          )}
        </div>
      </div>

      {canManage && (
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Más acciones"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(member);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onToggleActive(member);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                {isActive ? "Pausar" : "Reactivar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(member);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-danger-600 transition-colors hover:bg-danger-50 dark:hover:bg-danger-900/20"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
