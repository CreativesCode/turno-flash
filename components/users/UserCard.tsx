"use client";

import {
  Avatar,
  Badge,
  type BadgeProps,
  KebabMenu,
  type KebabMenuItem,
  ListRow,
} from "@/components/ui";
import type { UserProfile, UserRole } from "@/types/auth";
import { Trash2, UserCog } from "lucide-react";

export const ROLE_META: Record<
  UserRole,
  {
    label: string;
    badge: NonNullable<BadgeProps["variant"]>;
    chip: string;
    color: string;
    description: string;
  }
> = {
  admin: {
    label: "Admin",
    badge: "secondary",
    chip: "bg-secondary-100 text-secondary-600 dark:bg-secondary-900 dark:text-secondary-400",
    color: "var(--color-secondary-500)",
    description:
      "Acceso total al sistema. Puede gestionar usuarios, organizaciones y todas las funcionalidades.",
  },
  owner: {
    label: "Dueño",
    badge: "primary",
    chip: "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-400",
    color: "var(--color-primary)",
    description:
      "Gestiona su organización, servicios y reservas. No puede gestionar usuarios.",
  },
  staff: {
    label: "Empleado",
    badge: "muted",
    chip: "bg-surface-2 text-foreground-muted",
    color: "var(--color-info-500)",
    description:
      "Puede ver y gestionar reservas. Acceso limitado a funciones administrativas.",
  },
  special: {
    label: "Especial",
    badge: "warning",
    chip: "bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-400",
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
    <ListRow
      leading={
        <Avatar name={user.full_name || user.email} seed={user.id} size={40} />
      }
      title={isSelf ? `${name} (tú)` : name}
      titleAside={!user.is_active && <Badge variant="muted">Inactivo</Badge>}
      subtitle={
        updating
          ? "Actualizando rol…"
          : `${user.email} · ${orgName ?? "Sin organización"}`
      }
      trailing={
        <div className="flex items-center gap-1">
          <Badge variant={role.badge}>{role.label}</Badge>
          <KebabMenu items={items} />
        </div>
      }
    />
  );
}
