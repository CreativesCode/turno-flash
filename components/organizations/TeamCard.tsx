"use client";

import { Avatar, Button, Card, ConfirmSheet } from "@/components/ui";
import { toast } from "@/hooks";
import { TeamService } from "@/services";
import type { UserProfile } from "@/types/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useState } from "react";

/** Owner-facing list of employees with a switch to remove or restore access. */
export function TeamCard({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["team", organizationId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => TeamService.listStaff(organizationId),
  });
  const members = data?.data ?? [];
  const error = data?.error ?? null;
  const loading = isLoading;
  const [target, setTarget] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const confirmChange = async () => {
    if (!target) return;
    setSaving(true);
    const restoring = !target.is_active;
    const result = await TeamService.setAccess(target.user_id, restoring);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error ?? "No pudimos cambiar el acceso.");
      return;
    }
    toast.success(restoring ? "Acceso devuelto" : "Acceso quitado");
    setTarget(null);
    void queryClient.invalidateQueries({ queryKey });
  };

  const targetName = target ? target.full_name || target.email : "";

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info-100 text-info-700 dark:bg-info-900/20 dark:text-info-400">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Tu equipo</h2>
          <p className="mt-0.5 text-xs text-foreground-muted">
            Si alguien deja de trabajar contigo, quítale el acceso.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-foreground-muted">Cargando…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-danger-700 dark:text-danger-400">
          {error}
        </p>
      ) : members.length === 0 ? (
        <p className="mt-3 text-sm text-foreground-muted">
          Todavía no invitaste a nadie.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {members.map((member) => {
            const name = member.full_name || member.email;
            return (
              <li
                key={member.id}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2"
              >
                <Avatar name={name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {name}
                  </div>
                  <div className="truncate text-[11px] text-foreground-muted">
                    {member.is_active ? member.email : "Sin acceso"}
                  </div>
                </div>
                <Button
                  variant={member.is_active ? "ghost" : "soft"}
                  onClick={() => setTarget(member)}
                  className="min-h-11 shrink-0"
                >
                  {member.is_active ? "Quitar acceso" : "Devolver acceso"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmSheet
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={confirmChange}
        busy={saving}
        title={target?.is_active ? "Quitar acceso" : "Devolver acceso"}
        confirmLabel={target?.is_active ? "Quitar acceso" : "Devolver acceso"}
        busyLabel="Guardando…"
      >
        {target?.is_active
          ? `${targetName} ya no podrá ver turnos, clientes ni viajes de tu negocio. Podrás devolverle el acceso cuando quieras.`
          : `${targetName} volverá a entrar a tu negocio con su correo y contraseña.`}
      </ConfirmSheet>
    </Card>
  );
}
