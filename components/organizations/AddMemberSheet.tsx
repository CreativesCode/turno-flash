"use client";

import { Avatar, Button, Sheet } from "@/components/ui";
import { ROLE_META } from "@/components/users/UserCard";
import type { UserProfile } from "@/types/auth";
import { Check, UserPlus } from "lucide-react";
import { FormEvent } from "react";

export interface AddMemberSheetProps {
  open: boolean;
  onClose: () => void;
  /** Active users without organization (never owners or admins). */
  users: UserProfile[];
  loading: boolean;
  selectedUserId: string;
  onSelect: (userProfileId: string) => void;
  onSubmit: (e: FormEvent) => void | Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export function AddMemberSheet({
  open,
  onClose,
  users,
  loading,
  selectedUserId,
  onSelect,
  onSubmit,
  isSubmitting,
  error,
}: AddMemberSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Agregar miembro"
      subtitle="Usuarios activos que todavía no pertenecen a ninguna organización."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-foreground-muted">
            Cargando usuarios disponibles...
          </p>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-2 p-3 text-sm text-foreground-muted">
            No hay usuarios disponibles sin organización. Invítalos primero.
          </div>
        ) : (
          <div
            role="radiogroup"
            aria-label="Usuario a agregar"
            className="flex flex-col gap-2"
          >
            {users.map((user) => {
              const selected = selectedUserId === user.id;
              const name = user.full_name || user.email;
              const role = ROLE_META[user.role];
              return (
                <button
                  key={user.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelect(user.id)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-border bg-surface-2 hover:border-border-2"
                  }`}
                >
                  <Avatar name={name} color={role.color} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {name}
                    </div>
                    <div className="truncate text-[11px] text-foreground-muted">
                      {user.email}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${role.chip}`}
                  >
                    {role.label}
                  </span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-primary-600" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 justify-center"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="mesh-primary"
            disabled={isSubmitting || !selectedUserId}
            className="flex-2 justify-center"
          >
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? "Agregando…" : "Agregar miembro"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
