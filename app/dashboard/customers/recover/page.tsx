"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks";
import { createClient } from "@/utils/supabase/client";
import { Logger } from "@/utils/logger";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckSquare,
  HeartHandshake,
  Loader2,
  MessageSquare,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Campaña "Recuperar clientes": lista clientes sin visitas hace 30/60/90 días
 * y les envía un mensaje de reactivación por WhatsApp (edge function wa-campaign).
 * Throttle servidor: máx. 1 mensaje cada 30 días por cliente.
 */

type WindowKey = 30 | 60 | 90;

const WINDOWS: readonly { key: WindowKey; label: string }[] = [
  { key: 30, label: "+30 días" },
  { key: 60, label: "+60 días" },
  { key: 90, label: "+90 días" },
];

const MAX_PER_SEND = 50;
const THROTTLE_DAYS = 30;

interface DormantCustomer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  whatsapp_number: string | null;
  total_appointments: number;
  last_appointment_date: string | null;
  last_reactivation_sent_at: string | null;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function RecoverCustomersPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const [windowDays, setWindowDays] = useState<WindowKey>(60);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const canView =
    (profile?.role === "owner" || profile?.role === "admin") &&
    !!profile?.organization_id;

  const queryKey = ["customers", "dormant", profile?.organization_id, windowDays];
  const { data: customers = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<DormantCustomer[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, first_name, last_name, phone, whatsapp_number, total_appointments, last_appointment_date, last_reactivation_sent_at"
        )
        .eq("organization_id", profile!.organization_id!)
        .eq("is_active", true)
        .not("last_appointment_date", "is", null)
        .lt("last_appointment_date", daysAgoIso(windowDays))
        .order("last_appointment_date", { ascending: true })
        .limit(200);

      if (error) throw new Error(error.message);
      return (data ?? []) as DormantCustomer[];
    },
    enabled: canView,
    staleTime: 1000 * 60,
  });

  // Clientes contactados hace menos de 30 días: no re-enviables (throttle)
  const throttleCutoff = useMemo(() => daysAgoIso(THROTTLE_DAYS), []);
  const isThrottled = (c: DormantCustomer) =>
    !!c.last_reactivation_sent_at &&
    c.last_reactivation_sent_at > throttleCutoff;

  const sendable = useMemo(
    () => customers.filter((c) => !isThrottled(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customers, throttleCutoff]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === Math.min(sendable.length, MAX_PER_SEND)
        ? new Set()
        : new Set(sendable.slice(0, MAX_PER_SEND).map((c) => c.id))
    );
  };

  const handleSend = async () => {
    if (selected.size === 0 || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("wa-campaign", {
        body: { customerIds: Array.from(selected) },
      });

      if (error) throw new Error(error.message);

      const result = data as {
        success: boolean;
        sent: number;
        skipped_throttled: number;
        failed: number;
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || "Error al enviar la campaña");
      }

      toast.success(
        `${result.sent} mensaje${result.sent === 1 ? "" : "s"} enviado${result.sent === 1 ? "" : "s"}`,
        result.failed > 0
          ? `${result.failed} fallaron · ${result.skipped_throttled} ya contactados`
          : result.skipped_throttled > 0
            ? `${result.skipped_throttled} se omitieron (contactados hace poco)`
            : undefined
      );
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["customers", "dormant"] });
    } catch (err) {
      void Logger.error("Error sending reactivation campaign:", err);
      toast.error(
        "Error al enviar la campaña",
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSending(false);
    }
  };

  const allSelected =
    sendable.length > 0 &&
    selected.size === Math.min(sendable.length, MAX_PER_SEND);

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Recuperar clientes"
        description="Reactiva clientes dormidos enviándoles un mensaje de WhatsApp para que vuelvan a agendar."
      />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/dashboard/customers"
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a clientes
            </Link>
            <div className="flex items-center gap-3">
              <div className="mesh-secondary flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                  Recuperar clientes
                </h1>
                <p className="text-sm text-foreground-muted">
                  Invita por WhatsApp a los clientes que hace tiempo no vienen.
                </p>
              </div>
            </div>
          </div>

          {profile && !canView && (
            <Card className="p-8 text-center">
              <div className="text-sm font-bold text-foreground">
                Solo los dueños pueden enviar campañas
              </div>
            </Card>
          )}

          {canView && (
            <>
              {/* Filtro de antigüedad + acciones */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-xl border border-border bg-surface p-1">
                  {WINDOWS.map((w) => (
                    <button
                      key={w.key}
                      onClick={() => {
                        setWindowDays(w.key);
                        setSelected(new Set());
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        windowDays === w.key
                          ? "bg-primary-500 text-white shadow-sm"
                          : "text-foreground-muted hover:text-foreground"
                      }`}
                    >
                      Sin venir {w.label}
                    </button>
                  ))}
                </div>
                <Button
                  variant="mesh-primary"
                  onClick={handleSend}
                  disabled={selected.size === 0 || sending}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  Enviar a {selected.size || "…"}
                </Button>
              </div>

              {/* Lista */}
              <Card className="overflow-hidden p-0">
                {isLoading ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-14 animate-pulse rounded-xl bg-surface-2"
                      />
                    ))}
                  </div>
                ) : customers.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="text-sm font-bold text-foreground">
                      No hay clientes dormidos en este rango 🎉
                    </div>
                    <div className="mt-1 text-xs text-foreground-muted">
                      Todos tus clientes vinieron hace menos de {windowDays} días.
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={toggleAll}
                      className="flex w-full items-center gap-2.5 border-b border-border px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-foreground-muted transition-colors hover:bg-muted"
                    >
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary-500" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      Seleccionar todos ({Math.min(sendable.length, MAX_PER_SEND)}
                      {sendable.length > MAX_PER_SEND
                        ? ` de ${sendable.length}, máx. ${MAX_PER_SEND} por envío`
                        : ""}
                      )
                    </button>
                    <ul>
                      {customers.map((c) => {
                        const throttled = isThrottled(c);
                        const checked = selected.has(c.id);
                        return (
                          <li
                            key={c.id}
                            className="border-b border-border/60 last:border-0"
                          >
                            <button
                              onClick={() => !throttled && toggle(c.id)}
                              disabled={throttled}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                                throttled
                                  ? "cursor-not-allowed opacity-50"
                                  : "hover:bg-muted"
                              }`}
                            >
                              {checked ? (
                                <CheckSquare className="h-4.5 w-4.5 shrink-0 text-primary-500" />
                              ) : (
                                <Square className="h-4.5 w-4.5 shrink-0 text-foreground-subtle" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {c.first_name} {c.last_name}
                                </div>
                                <div className="text-xs text-foreground-muted">
                                  Última visita: {formatDate(c.last_appointment_date)}{" "}
                                  · {c.total_appointments} turno
                                  {c.total_appointments === 1 ? "" : "s"}
                                </div>
                              </div>
                              {throttled && (
                                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-foreground-muted">
                                  Contactado {formatDate(c.last_reactivation_sent_at)}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </Card>

              <p className="mt-3 text-center text-[11px] text-foreground-muted">
                Para no molestar, cada cliente recibe como máximo 1 mensaje de
                reactivación cada {THROTTLE_DAYS} días.
              </p>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
