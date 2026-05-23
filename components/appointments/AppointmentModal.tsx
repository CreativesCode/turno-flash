"use client";

import {
  Avatar,
  Button,
  Field,
  Sheet,
  StatusBadge,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import type {
  AppointmentFormData,
  AppointmentStatus,
  AppointmentWithDetails,
  Customer,
  CustomerFormData,
  Service,
  StaffMember,
} from "@/types/appointments";
import { NEXT_ACTIONS } from "@/utils/appointment-status";
import { formatDateForDisplay, parseLocalDate } from "@/utils/date";
import { fmtDuration, fmtMoney } from "@/utils/format";
import {
  ChevronRight,
  Edit3,
  MessageCircle,
  Phone,
  Plus,
  X,
} from "lucide-react";
import { FormEvent, ReactNode } from "react";

/* ────────────────────────────────────────────────────────────
 * Create modal
 * ──────────────────────────────────────────────────────────── */
export interface AppointmentCreateModalProps {
  open: boolean;
  onClose: () => void;
  formData: AppointmentFormData;
  onChange: (patch: Partial<AppointmentFormData>) => void;
  onServiceChange: (serviceId: string) => void;
  onStartTimeChange: (time: string) => void;
  onSubmit: (e: FormEvent) => void | Promise<void>;
  isSubmitting: boolean;

  customers: Customer[];
  services: Service[];
  staff: StaffMember[];

  /** Quick-create customer inline */
  showNewCustomerForm: boolean;
  onToggleNewCustomerForm: () => void;
  newCustomerData: CustomerFormData;
  onChangeNewCustomer: (patch: Partial<CustomerFormData>) => void;
  onCreateCustomer: () => void | Promise<void>;
  isCreatingCustomer: boolean;
}

export function AppointmentCreateModal({
  open,
  onClose,
  formData,
  onChange,
  onServiceChange,
  onStartTimeChange,
  onSubmit,
  isSubmitting,
  customers,
  services,
  staff,
  showNewCustomerForm,
  onToggleNewCustomerForm,
  newCustomerData,
  onChangeNewCustomer,
  onCreateCustomer,
  isCreatingCustomer,
}: AppointmentCreateModalProps) {
  const selectedService = services.find((s) => s.id === formData.service_id);

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo turno">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {/* Customer */}
        <Field label="Cliente">
          <div className="flex items-center justify-between gap-2">
            <select
              required
              value={formData.customer_id}
              onChange={(e) => onChange({ customer_id: e.target.value })}
              className={inputClasses}
            >
              <option value="">Selecciona un cliente</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} — {c.phone}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggleNewCustomerForm}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-semibold text-secondary-500 transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-900/20"
            >
              <Plus className="h-3.5 w-3.5" />
              {showNewCustomerForm ? "Cerrar" : "Nuevo"}
            </button>
          </div>
          {customers.length === 0 && !showNewCustomerForm && (
            <p className="mt-1.5 text-xs text-warning-600 dark:text-warning-400">
              No hay clientes. Crea uno con el botón &quot;Nuevo&quot;.
            </p>
          )}

          {showNewCustomerForm && (
            <div className="mt-3 rounded-xl border border-info-200 bg-info-50 p-3 dark:border-info-800 dark:bg-info-900/20">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-info-700 dark:text-info-300">
                Crear cliente rápido
              </h3>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nombre"
                    value={newCustomerData.first_name}
                    onChange={(e) =>
                      onChangeNewCustomer({ first_name: e.target.value })
                    }
                    className={inputClasses}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Apellido"
                    value={newCustomerData.last_name}
                    onChange={(e) =>
                      onChangeNewCustomer({ last_name: e.target.value })
                    }
                    className={inputClasses}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    required
                    placeholder="+54 11 1234-5678"
                    value={newCustomerData.phone}
                    onChange={(e) =>
                      onChangeNewCustomer({ phone: e.target.value })
                    }
                    className={inputClasses}
                  />
                  <input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={newCustomerData.email ?? ""}
                    onChange={(e) =>
                      onChangeNewCustomer({ email: e.target.value })
                    }
                    className={inputClasses}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="mesh-secondary"
                    size="sm"
                    onClick={onCreateCustomer}
                    disabled={isCreatingCustomer}
                    className="flex-1 justify-center"
                  >
                    {isCreatingCustomer ? "Creando…" : "Crear y seleccionar"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onToggleNewCustomerForm}
                    disabled={isCreatingCustomer}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Field>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <input
              type="date"
              required
              value={formData.appointment_date}
              onChange={(e) => onChange({ appointment_date: e.target.value })}
              className={inputClasses}
            />
          </Field>
          <Field label="Hora">
            <input
              type="time"
              required
              value={formData.start_time}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className={inputClasses}
            />
          </Field>
        </div>

        {/* Service */}
        <Field label="Servicio">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((s) => {
              const selected = formData.service_id === s.id;
              const dot = s.color ?? "#94a3b8";
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onServiceChange(s.id)}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    selected
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-border bg-surface hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: dot }}
                    />
                    <span className="truncate text-sm font-semibold text-foreground">
                      {s.name}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-foreground-muted">
                    {fmtDuration(s.duration_minutes)} ·{" "}
                    {s.price != null ? fmtMoney(s.price) : "Sin precio"}
                  </div>
                </button>
              );
            })}
          </div>
          {services.length === 0 && (
            <p className="mt-1.5 text-xs text-warning-600 dark:text-warning-400">
              No hay servicios. Crea uno en la sección de servicios.
            </p>
          )}
          {selectedService?.requires_approval && (
            <p className="mt-2 rounded-md bg-warning-50 px-2.5 py-1.5 text-xs text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">
              ⚠️ Este servicio requiere aprobación. El turno se creará como
              &quot;Pendiente&quot;.
            </p>
          )}
        </Field>

        {/* Staff */}
        <Field label="Profesional (opcional)">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <ChipButton
              selected={!formData.staff_id}
              onClick={() => onChange({ staff_id: null })}
            >
              Cualquiera
            </ChipButton>
            {staff.map((s) => {
              const selected = formData.staff_id === s.id;
              const dot = s.color ?? "#94a3b8";
              const label = s.nickname ?? `${s.first_name} ${s.last_name}`;
              return (
                <ChipButton
                  key={s.id}
                  selected={selected}
                  onClick={() => onChange({ staff_id: s.id })}
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: dot }}
                  />
                  {label}
                </ChipButton>
              );
            })}
          </div>
        </Field>

        {/* Notes */}
        <Field label="Notas (opcional)">
          <textarea
            rows={2}
            value={formData.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Algo importante para este turno…"
            className={inputClasses}
          />
        </Field>

        {/* Buttons */}
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
            disabled={
              isSubmitting || customers.length === 0 || services.length === 0
            }
            className="flex-2 justify-center"
          >
            {isSubmitting ? "Guardando…" : "Crear turno"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function ChipButton({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-surface text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────
 * Detail modal
 * ──────────────────────────────────────────────────────────── */
export interface AppointmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentWithDetails;
  onAdvance: (toStatus: AppointmentStatus) => void | Promise<void>;
  onSendReminder: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  onMarkNoShow?: () => void | Promise<void>;
  onEdit?: () => void;
  /** Look up service color (hex) for the dot in the detail grid. */
  serviceColor?: string | null;
  /** Look up staff color (hex) for the dot in the detail grid. */
  staffColor?: string | null;
  isProcessing?: boolean;
}

export function AppointmentDetailModal({
  open,
  onClose,
  appointment: a,
  onAdvance,
  onSendReminder,
  onCancel,
  onMarkNoShow,
  onEdit,
  serviceColor,
  staffColor,
  isProcessing = false,
}: AppointmentDetailModalProps) {
  const status = (a.status ?? "pending") as AppointmentStatus;
  const next = NEXT_ACTIONS[status];
  const customerName =
    `${a.customer_first_name} ${a.customer_last_name}`.trim() || "Sin nombre";
  const staffName = a.staff_nickname
    ? a.staff_nickname
    : a.staff_first_name
      ? `${a.staff_first_name} ${a.staff_last_name ?? ""}`.trim()
      : "—";
  const startTime = a.start_time?.slice(0, 5) ?? "";
  const endTime = a.end_time?.slice(0, 5) ?? "";
  const dateLabel = formatDateForDisplay(parseLocalDate(a.appointment_date), {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  const isTerminal =
    status === "completed" || status === "cancelled" || status === "no_show";

  return (
    <Sheet open={open} onClose={onClose} title="Detalle del turno">
      <div className="flex flex-col gap-4">
        {/* Customer header */}
        <div className="flex items-center gap-3">
          <Avatar name={customerName} size={48} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-foreground">
              {customerName}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground-muted">
              <Phone className="h-3 w-3" />
              <span className="truncate">{a.customer_phone || "—"}</span>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-2 p-3">
          <DetailItem label="Fecha" value={dateLabel} />
          <DetailItem label="Hora" value={`${startTime} – ${endTime}`} />
          <DetailItem
            label="Servicio"
            value={a.service_name}
            dot={serviceColor ?? undefined}
          />
          <DetailItem
            label="Profesional"
            value={staffName}
            dot={staffColor ?? undefined}
          />
          <DetailItem
            label="Duración"
            value={fmtDuration(a.duration_minutes)}
          />
          <DetailItem
            label="Precio"
            value={a.service_price != null ? fmtMoney(a.service_price) : "—"}
          />
        </div>

        {/* Notes */}
        {a.notes && (
          <div className="rounded-xl border border-border bg-surface px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
              Notas
            </div>
            <p className="mt-1 text-sm text-foreground">{a.notes}</p>
          </div>
        )}

        {/* Actions */}
        {!isTerminal && (
          <div className="flex flex-col gap-2">
            {next && (
              <Button
                variant="mesh-primary"
                onClick={() =>
                  next.to === "reminded"
                    ? onSendReminder()
                    : onAdvance(next.to)
                }
                disabled={isProcessing}
                className="w-full justify-center"
              >
                {next.label}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            <div className="grid grid-cols-3 gap-2">
              <ActionTile
                icon={<MessageCircle className="h-4 w-4" />}
                label="WhatsApp"
                onClick={onSendReminder}
                disabled={isProcessing}
              />
              {onEdit && (
                <ActionTile
                  icon={<Edit3 className="h-4 w-4" />}
                  label="Editar"
                  onClick={onEdit}
                  disabled={isProcessing}
                />
              )}
              {onMarkNoShow && (
                <ActionTile
                  icon={<X className="h-4 w-4" />}
                  label="No vino"
                  tone="warning"
                  onClick={onMarkNoShow}
                  disabled={isProcessing}
                />
              )}
              <ActionTile
                icon={<X className="h-4 w-4" />}
                label="Cancelar"
                tone="danger"
                onClick={onCancel}
                disabled={isProcessing}
              />
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function DetailItem({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        {dot && (
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: dot }}
          />
        )}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function ActionTile({
  icon,
  label,
  onClick,
  tone = "neutral",
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void | Promise<void>;
  tone?: "neutral" | "warning" | "danger";
  disabled?: boolean;
}) {
  const toneClasses =
    tone === "danger"
      ? "text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
      : tone === "warning"
        ? "text-warning-700 hover:bg-warning-50 dark:hover:bg-warning-900/20"
        : "text-foreground hover:bg-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface px-2 py-2.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${toneClasses}`}
    >
      {icon}
      {label}
    </button>
  );
}
