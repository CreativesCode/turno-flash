"use client";

import { Badge, Button, Card, Field, sheetInputClasses } from "@/components/ui";
import { useToast } from "@/hooks";
import { useRealtimeWAOutbound } from "@/hooks/useRealtimeEntities";
import { createClient } from "@/utils/supabase/client";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircle,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Props {
  organizationId: string;
}

interface OutboundRow {
  id: string;
  intent: string;
  chat_id: string;
  status: string;
  sent_at: string;
  error_message: string | null;
}

const INTENT_LABELS: Record<string, string> = {
  confirm: "Confirmación",
  reminder_24h: "Recordatorio 24h",
  reminder_1h: "Recordatorio 1h",
  reminder_manual: "Recordatorio manual",
  clarify: "Pedido de clarificación",
  notify_business_new: "Aviso al negocio (nuevo)",
  notify_business_cancel: "Aviso al negocio (cancelado)",
  notify_business_confirm: "Aviso al negocio (confirmado)",
  cancel_ack: "Confirmación de cancelación",
  confirm_ack: "Confirmación recibida",
};

function statusTone(
  status: string
): "success" | "danger" | "warning" | "info" {
  if (status === "failed") return "danger";
  if (status === "delivered" || status === "read" || status === "sent")
    return "success";
  if (status === "pending") return "warning";
  return "info";
}

/**
 * Sección de configuración WhatsApp/OpenWA para una organización.
 * Pensada para inyectarse dentro de la página de detalles de organización
 * (solo visible para admin). No incluye el `whatsapp_phone` de la org
 * porque ese se edita en el formulario de información básica.
 */
export function WhatsAppOrgSection({ organizationId }: Props) {
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [initialEnabled, setInitialEnabled] = useState(false);
  const [initialSessionId, setInitialSessionId] = useState("");
  const [recent, setRecent] = useState<OutboundRow[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://<tu-proyecto>.supabase.co";
  const webhookUrl = `${supabaseUrl}/functions/v1/wa-inbound`;

  const reload = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [settingsRes, recentRes] = await Promise.all([
        supabase
          .from("business_settings")
          .select("whatsapp_integration_enabled, openwa_session_id")
          .eq("organization_id", organizationId)
          .maybeSingle(),
        supabase
          .from("wa_outbound_messages")
          .select("id, intent, chat_id, status, sent_at, error_message")
          .eq("organization_id", organizationId)
          .order("sent_at", { ascending: false })
          .limit(20),
      ]);

      const wa = settingsRes.data?.whatsapp_integration_enabled ?? false;
      const sid = settingsRes.data?.openwa_session_id ?? "";
      setEnabled(wa);
      setSessionId(sid);
      setInitialEnabled(wa);
      setInitialSessionId(sid);
      setRecent((recentRes.data ?? []) as OutboundRow[]);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Error cargando configuración"
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Realtime: refrescar lista de mensajes recientes cuando llegan/cambian
  // eventos en wa_outbound_messages para esta organización.
  useRealtimeWAOutbound({ onChange: () => void reload() });

  const isDirty =
    enabled !== initialEnabled || sessionId.trim() !== initialSessionId;

  const canSave =
    !saving &&
    !loading &&
    isDirty &&
    (!enabled || (enabled && sessionId.trim().length > 0));

  const save = async () => {
    setSaving(true);
    setPageError(null);
    try {
      const { error: bsErr } = await supabase
        .from("business_settings")
        .upsert(
          {
            organization_id: organizationId,
            whatsapp_integration_enabled: enabled,
            openwa_session_id: sessionId.trim() || null,
          },
          { onConflict: "organization_id" }
        );
      if (bsErr) throw bsErr;

      toast.success("Configuración WhatsApp guardada");
      await reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setPageError(msg);
      toast.error("No se pudo guardar", msg);
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("URL copiada");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400">
          <MessageCircle className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Integración WhatsApp
          </h2>
          <p className="text-xs text-foreground-muted">
            Configuración de OpenWA para esta organización
          </p>
        </div>
      </div>

      {pageError && (
        <div className="rounded-md bg-danger-50 px-3 py-2 text-xs text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
          {pageError}
        </div>
      )}

      {/* Toggle */}
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Estado de la integración
          </div>
          <p className="mt-0.5 text-xs text-foreground-muted">
            Cuando está activa, se envían WhatsApps al crear turnos y al
            disparar recordatorios.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          disabled={loading || saving}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            enabled ? "bg-success" : "bg-border-2"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {enabled && !sessionId.trim() && (
        <div className="flex items-start gap-2 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-800 dark:bg-warning-900/20 dark:text-warning-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Activaste la integración pero falta el ID de sesión. No se enviará
            nada hasta completarlo.
          </span>
        </div>
      )}

      {/* Session ID */}
      <Field
        label="Session ID OpenWA"
        hint="El UUID que aparece como 'SESSION ID' en el dashboard de OpenWA (ej: cf595850-c73...). NO uses el nombre/alias de la sesión — debe ser el UUID completo."
      >
        <input
          type="text"
          className={sheetInputClasses}
          placeholder="cf595850-c73a-4b21-9f3e-..."
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          disabled={loading || saving}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>

      {/* Webhook URL */}
      <div className="space-y-2">
        <div className="block text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
          URL del Webhook
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
          <code className="flex-1 truncate font-mono text-[12px] text-foreground">
            {webhookUrl}
          </code>
          <button
            type="button"
            onClick={copyWebhookUrl}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
            aria-label="Copiar URL"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-foreground-subtle">
          Registrala en el dashboard de OpenWA → Webhooks (eventos:{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
            message.received
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
            session.disconnected
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
            session.qr
          </code>
          ).
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end">
        <Button variant="mesh-primary" onClick={save} disabled={!canSave}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      {/* Recent */}
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">
            Últimos 20 envíos
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            className="text-[11px] font-medium text-info-700 hover:underline dark:text-info-400"
            disabled={loading}
          >
            Recargar
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-foreground-muted">Cargando...</p>
        ) : recent.length === 0 ? (
          <p className="text-xs text-foreground-muted">
            Todavía no se envió ningún mensaje desde esta organización.
          </p>
        ) : (
          <div className="-mx-6 overflow-x-auto sm:mx-0">
            <table className="w-full text-left text-xs">
              <thead className="text-foreground-muted">
                <tr>
                  <th className="px-6 pb-2 font-semibold sm:px-0">Cuándo</th>
                  <th className="px-3 pb-2 font-semibold">Tipo</th>
                  <th className="px-3 pb-2 font-semibold">A</th>
                  <th className="px-3 pb-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-6 py-2 text-foreground sm:px-0">
                      {new Date(r.sent_at).toLocaleString("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {INTENT_LABELS[r.intent] ?? r.intent}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-foreground-muted">
                      {r.chat_id.replace(/@c\.us$/, "")}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={statusTone(r.status)}>
                        {r.status === "sent" && (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {r.status === "failed" && (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {r.status}
                      </Badge>
                      {r.error_message && (
                        <p
                          className="mt-1 max-w-50 truncate text-[10px] text-danger"
                          title={r.error_message}
                        >
                          {r.error_message}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
