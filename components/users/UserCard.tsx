"use client";

import { Avatar, Card, KebabMenu, type KebabMenuItem } from "@/components/ui";
import type { UserProfile, UserRole } from "@/types/auth";
import { Trash2, UserCog } from "lucide-react";

export const ROLE_META: Record<
  UserRole,
  { label: string; chip: string; color: string; description: string }
> = {
  admin: {
    label: "Admin",
    chip: "bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400",
    color: "var(--color-secondary-500)",
    description:
      "Acceso total al sistema. Puede gestionar usuarios, organizaciones y todas las funcionalidades.",
  },
  owner: {
    label: "Dueño",
    chip: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
    color: "var(--color-primary-500)",
    description:
      "Gestiona su organización, servicios y reservas. No puede gestionar usuarios.",
  },
  staff: {
    label: "Empleado",
    chip: "bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400",
    color: "var(--color-info-500)",
    description:
      "Puede ver y gestionar reservas. Acceso limitado a funciones administrativas.",
  },
  special: {
    label: "Especial",
    chip: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
    color: "var(--color-warning-500)",
    description:
      "Usuario con permisos especiales personalizables. Similar a empleado por defecto.",
  },
};

export const ROLE_ORDER: UserRole[] = ["admin", "owner", "staff", "special"];

export interface UserCardProps {
  user: UserProfile;
  orgName: string | null;
  isSelf: boolean;
  updating: boolean;
  onRoleChange: (user: UserProfile, role: UserRole) => void;
  onDelete: (user: UserProfile) => void;
}

export function UserCard({
  user,
  orgName,
  isSelf,
  updating,
  onRoleChange,
  onDelete,
}: UserCardProps) {
  const role = ROLE_META[user.role];
  const name = user.full_name || "Sin nombre";

  const items: KebabMenuItem[] = [
    ...ROLE_ORDER.filter((r) => r !== user.role).map((r) => ({
      label: `Cambiar a ${ROLE_META[r].label}`,
      icon: <UserCog className="h-3.5 w-3.5" />,
      disabled: updating,
      onClick: () => onRoleChange(user, r),
    })),
    {
      label: "Eliminar",
      icon: <Trash2 className="h-3.5 w-3.5" />,
      danger: true,
      onClick: () => onDelete(user),
    },
  ];

  return (
    <Card className="flex items-center gap-3 p-3">
      <Avatar
        name={user.full_name || user.email}
        color={role.color}
        size={40}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-foreground">
            {name}
          </span>
          {isSelf && (
            <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-px text-[10px] font-semibold text-foreground-muted">
              Tú
            </span>
          )}
          {!user.is_active && (
            <span className="shrink-0 rounded-full border border-danger-600 px-1.5 py-px text-[10px] font-bold text-danger-600 dark:border-danger-400 dark:text-danger-300">
              Inactivo
            </span>
          )}
        </div>
        <div className="truncate text-xs text-foreground-muted">
          {user.email}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-foreground-subtle">
          {updating ? "Actualizando rol…" : (orgName ?? "Sin organización")}
        </div>
      </div>

      <span
        className={`shrink-0 rounded-full px-2.25 py-1 text-[10px] font-bold uppercase tracking-[0.04em] ${role.chip}`}
      >
        {role.label}
      </span>
      <KebabMenu items={items} />
    </Card>
  );
}
