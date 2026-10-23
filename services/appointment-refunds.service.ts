import type { PaymentMethod } from "@/services/appointment-payments.service";
import type { Database } from "@/types/database.types";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";

export type RefundStatus = Database["public"]["Enums"]["appointment_refund_status"];
export type AppointmentRefundEvent =
  Database["public"]["Tables"]["appointment_refund_events"]["Row"];
export type AppointmentRefund = Database["public"]["Tables"]["appointment_refunds"]["Row"] & {
  events: AppointmentRefundEvent[];
};

/** A refund as the "Registrar devolución" sheet sends it. */
export interface NewAppointmentRefund {
  amount: number;
  reason: string;
  /** Owner/admin "Ya la devolví": registered as processed, with method and date. */
  processed: boolean;
  method: PaymentMethod | null;
  methodOther: string | null;
  /** ISO; null = now */
  refundedAt: string | null;
}

/** How a pending refund is decided (owner or admin). */
export type RefundDecision =
  | { status: "processed"; method: PaymentMethod; methodOther: string | null; refundedAt: string | null }
  | { status: "rejected"; reason: string };

const RPC_ERRORS: Record<string, string> = {
  refund_forbidden: "No tienes permiso para esto.",
  refund_not_found: "No se encontró el turno o la devolución. Actualiza la pantalla.",
  refund_not_cancelled: "Solo se devuelve en turnos cancelados o en los que el cliente no vino.",
  refunds_disabled: "Tu negocio no hace devoluciones (Ajustes).",
  refund_not_pending: "Esa devolución ya estaba resuelta.",
  invalid_amount: "El importe no es válido o supera lo que queda por devolver.",
  invalid_reason: "Escribe el motivo.",
  invalid_method: "Elige cómo devolviste el dinero.",
  invalid_refunded_at: "La fecha no puede ser futura.",
};

function rpcError(message: string, fallback: string): string {
  const key = Object.keys(RPC_ERRORS).find((k) => message.includes(k));
  return key ? RPC_ERRORS[key] : `${fallback}: ${message}`;
}

/** Refunds of an appointment and their history (TUR0010, migration 097). */
export class AppointmentRefundsService {
  static async list(appointmentId: string): Promise<AppointmentRefund[]> {
    const supabase = createClient();
    const { data: refunds, error } = await supabase
      .from("appointment_refunds")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: true });
    if (error) {
      void Logger.error("Error loading appointment refunds", error, { appointmentId });
      throw new Error("No se pudieron cargar las devoluciones");
    }
    if (!refunds?.length) return [];

    const { data: events, error: eventsError } = await supabase
      .from("appointment_refund_events")
      .select("*")
      .in(
        "refund_id",
        refunds.map((r) => r.id)
      )
      .order("changed_at", { ascending: true });
    if (eventsError) {
      void Logger.error("Error loading refund history", eventsError, { appointmentId });
      throw new Error("No se pudo cargar el historial de las devoluciones");
    }
    return refunds.map((r) => ({
      ...r,
      events: (events ?? []).filter((e) => e.refund_id === r.id),
    }));
  }

  static async register(
    appointmentId: string,
    refund: NewAppointmentRefund
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    // Method, its text and the date may be NULL in SQL; the generated types do not say so
    const args = {
      p_appointment_id: appointmentId,
      p_amount: refund.amount,
      p_reason: refund.reason,
      p_method: refund.method,
      p_method_other: refund.methodOther,
      p_processed: refund.processed,
      p_refunded_at: refund.refundedAt,
    } as unknown as Database["public"]["Functions"]["register_appointment_refund"]["Args"];
    const { error } = await supabase.rpc("register_appointment_refund", args);
    if (!error) return { success: true };

    void Logger.error("Error registering appointment refund", error);
    return { success: false, error: rpcError(error.message, "No se pudo registrar la devolución") };
  }

  static async decide(
    refundId: string,
    decision: RefundDecision
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    const processed = decision.status === "processed";
    const args = {
      p_refund_id: refundId,
      p_status: decision.status,
      p_note: processed ? null : decision.reason,
      p_method: processed ? decision.method : null,
      p_method_other: processed ? decision.methodOther : null,
      p_refunded_at: processed ? decision.refundedAt : null,
    } as unknown as Database["public"]["Functions"]["set_appointment_refund_status"]["Args"];
    const { error } = await supabase.rpc("set_appointment_refund_status", args);
    if (!error) return { success: true };

    void Logger.error("Error deciding appointment refund", error);
    return { success: false, error: rpcError(error.message, "No se pudo guardar la devolución") };
  }
}
