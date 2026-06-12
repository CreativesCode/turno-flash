"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks";
import {
  useBusinessSettings,
  useUpdateBusinessSettings,
  type BusinessAutomationSettingsPatch,
} from "@/hooks/useBusinessSettings.query";
import {
  Loader2,
  MessageSquare,
  Settings as SettingsIcon,
  Star,
  Sunrise,
} from "lucide-react";
import { useState } from "react";

/**
 * Ajustes de automatización del negocio (owner/admin con organización):
 * valoración post-cita y resumen diario por WhatsApp.
 * La integración WhatsApp en sí (sesión OpenWA) la configura el admin desde
 * el detalle de la organización.
 */
export default function SettingsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const { data: settings, isLoading, error } = useBusinessSettings();
  const updateMutation = useUpdateBusinessSettings();

  const canView =
    (profile?.role === "owner" || profile?.role === "admin") &&
    !!profile?.organization_id;

  // Formulario = datos del servidor + cambios locales pendientes (draft).
  // Sin useEffect: los valores se derivan en render.
  const [draft, setDraft] = useState<BusinessAutomationSettingsPatch>({});
  const dirty = Object.keys(draft).length > 0;

  const ratingEnabled =
    draft.enable_rating_request ?? settings?.enable_rating_request ?? true;
  const summaryEnabled =
    draft.enable_daily_summary ?? settings?.enable_daily_summary ?? false;
  const summaryTime = (
    draft.daily_summary_time ??
    settings?.daily_summary_time ??
    "07:00"
  ).slice(0, 5);

  const patchDraft = (patch: BusinessAutomationSettingsPatch) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const waEnabled = settings?.whatsapp_integration_enabled ?? false;

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        enable_rating_request: ratingEnabled,
        enable_daily_summary: summaryEnabled,
        daily_summary_time: summaryTime,
      });
      toast.success("Ajustes guardados");
      setDraft({});
    } catch (err) {
      toast.error(
        "Error al guardar",
        err instanceof Error ? err.message : undefined
      );
    }
  };

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Ajustes"
        description="Configura las automatizaciones de tu negocio: valoraciones post-cita y resumen diario por WhatsApp."
      />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="mesh-info flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Ajustes
              </h1>
              <p className="text-sm text-foreground-muted">
                Automatizaciones por WhatsApp de tu negocio.
              </p>
            </div>
          </div>

          {profile && !canView && (
            <Card className="p-8 text-center">
              <div className="text-sm font-bold text-foreground">
                Solo los dueños pueden cambiar los ajustes
              </div>
            </Card>
          )}

          {canView && error && (
            <Card className="border-danger-200 bg-danger-50 p-5 text-sm text-danger-800 dark:border-danger-900/40 dark:bg-danger-900/20 dark:text-danger-200">
              {error.message}
            </Card>
          )}

          {canView && !error && (
            <>
              {/* Estado de la integración */}
              <Card className="mb-4 flex items-start gap-3 p-4">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    waEnabled
                      ? "bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400"
                      : "bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400"
                  }`}
                >
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    WhatsApp {waEnabled ? "conectado" : "no conectado"}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">
                    {waEnabled
                      ? "La integración está activa: las automatizaciones de abajo se enviarán por WhatsApp."
                      : "Las automatizaciones quedan guardadas pero no se enviará nada hasta que el administrador conecte WhatsApp para tu negocio."}
                  </p>
                </div>
              </Card>

              {/* Toggles */}
              <Card className="divide-y divide-border p-0">
                <SettingRow
                  icon={Star}
                  title="Pedir valoración al completar un turno"
                  description="Al marcar un turno como completado, le pedimos al cliente una valoración de 1 a 5 estrellas. Alimenta el rating de tus reportes."
                  loading={isLoading}
                  checked={ratingEnabled}
                  onChange={(v) => patchDraft({ enable_rating_request: v })}
                />
                <SettingRow
                  icon={Sunrise}
                  title="Resumen diario por WhatsApp"
                  description="Cada mañana te enviamos al WhatsApp del negocio cuántos turnos tienes hoy, cuántos faltan confirmar y el ingreso estimado."
                  loading={isLoading}
                  checked={summaryEnabled}
                  onChange={(v) => patchDraft({ enable_daily_summary: v })}
                  extra={
                    summaryEnabled && (
                      <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-foreground-muted">
                        Hora de envío
                        <input
                          type="time"
                          value={summaryTime}
                          onChange={(e) =>
                            patchDraft({ daily_summary_time: e.target.value })
                          }
                          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500"
                        />
                        <span className="font-normal">
                          (hora local de tu negocio)
                        </span>
                      </label>
                    )
                  }
                />
              </Card>

              <div className="mt-5 flex justify-end">
                <Button
                  variant="mesh-primary"
                  onClick={handleSave}
                  disabled={!dirty || updateMutation.isPending || isLoading}
                >
                  {updateMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Guardar cambios
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ───────────────────────────────────────────────────────────

function SettingRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  loading,
  extra,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  loading?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-foreground-muted">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">{title}</div>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">
              {description}
            </p>
          </div>
        </div>
        <Toggle checked={checked} onChange={onChange} disabled={loading} />
      </div>
      {extra}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary-500" : "bg-border-2"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
          checked ? "left-5.5" : "left-0.5"
        }`}
      />
    </button>
  );
}
