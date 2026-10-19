"use client";

import {
  Avatar,
  Button,
  Field,
  KebabMenu,
  Sheet,
  StatusBadge,
  sheetInputClasses as inputClasses,
  SheetFooter,
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
import { CustomerPicker } from "@/components/appointments/CustomerPicker";
import {
  DepositChoice,
  DepositPanel,
  type DepositChoiceValue,
} from "@/components/appointments/DepositPanel";
import { depositOpen, serviceDepositAmount, type DepositAction } from "@/utils/deposit";
import { NEXT_ACTIONS } from "@/utils/appointment-status";
import { formatDateForDisplay, parseLocalDate } from "@/utils/date";
import { toInternationalPhone } from "@/utils/phone";
import { ServiceBadge } from "@/components/services/ServiceBadge";
import { useServiceCategories } from "@/hooks";
import { useMoney } from "@/hooks/useMoney";
import { fmtDuration } from "@/utils/format";
import { groupServices, hasCategoryGroups } from "@/utils/group-services";
import { CalendarClock, MessageCircle, Plus, X } from "lucide-react";
import { FormEvent, ReactNode, useMemo } from "react";

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
  /** Customers load when the form opens (P2-06). */
  customersLoading?: boolean;
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
  customersLoading,
  services,
  staff,
  showNewCustomerForm,
  onToggleNewCustomerForm,
  newCustomerData,
  onChangeNewCustomer,
  onCreateCustomer,
  isCreatingCustomer,
}: AppointmentCreateModalProps) {
  const { format: money } = useMoney();
  const { categories } = useServiceCategories();
  // The normalized store keeps insertion order, not the owner's order
  const serviceGroups = useMemo(
    () =>
      groupServices(
        [...services].sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
            a.name.localeCompare(b.name)
        ),
        categories.filter((c) => c.is_active ?? true)
      ),
    [services, categories]
  );
  const showServiceHeadings = hasCategoryGroups(serviceGroups);
  const selectedService = services.find((s) => s.id === formData.service_id);
  const depositAmount = selectedService
    ? serviceDepositAmount(selectedService)
    : null;

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo turno">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {/* Customer */}
        <Field label="Cliente">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CustomerPicker
                customers={customers}
                loading={customersLoading}
                value={formData.customer_id}
                onSelect={(id) => onChange({ customer_id: id })}
                onCreateWith={(query) => {
                  // Mostly a phone typed from the caller ID; otherwise a name
                  const isPhone = query.replace(/\D/g, "").length >= 6;
                  onChangeNewCustomer(
                    isPhone ? { phone: query } : { first_name: query }
                  );
                  if (!showNewCustomerForm) onToggleNewCustomerForm();
                }}
              />
            </div>
            <button
              type="button"
              onClick={onToggleNewCustomerForm}
              className="flex h-12 shrink-0 cursor-pointer items-center gap-1 rounded-control border border-border-2 bg-surface px-3 text-meta font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Plus className="size-4" />
              {showNewCustomerForm ? "Cerrar" : "Nuevo"}
            </button>
          </div>
          {customers.length === 0 && !showNewCustomerForm && (
            <p className="mt-1.5 text-caption text-warning-700 dark:text-warning-400">
              No hay clientes. Crea uno con el botón &quot;Nuevo&quot;.
            </p>
          )}

          {showNewCustomerForm && (
            <div className="mt-3 rounded-card bg-surface-2 p-3">
              <h3 className="mb-2 text-meta font-semibold text-foreground-muted">
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
                    placeholder="Apellido (opcional)"
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
                    placeholder="+53 5 123 4567"
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
                    variant="primary"
                    size="sm"
                    onClick={onCreateCustomer}
                    disabled={isCreatingCustomer}
                    className="flex-1 justify-center"
                  >
                    {isCreatingCustomer ? "Creando…" : "Crear y seleccionar"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
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
          <div className="flex flex-col gap-3">
            {serviceGroups.map((group) => (
              <div key={group.category?.id ?? "none"}>
                {showServiceHeadings && (
                  <p className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-foreground-muted">
                    {group.category?.name ?? "Sin categoría"}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {group.services.map((s) => {
                    const selected = formData.service_id === s.id;
                    const dot = s.color ?? "#94a3b8";
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onServiceChange(s.id)}
                        aria-pressed={selected}
                        className={`cursor-pointer rounded-control border px-3.5 py-2.5 text-left transition-colors ${
                          selected
                            ? "border-primary bg-primary-100 dark:bg-primary-900"
                            : "border-border-2 bg-surface hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="size-1.5 shrink-0 rounded-[2px]"
                            style={{ background: dot }}
                          />
                          <span className="truncate text-body font-semibold text-foreground">
                            {s.name}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-foreground-muted">
                          <span>
                            {fmtDuration(s.duration_minutes)} ·{" "}
                            {s.price != null ? money(s.price) : "Sin precio"}
                          </span>
                          <ServiceBadge badge={s.badge} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {services.length === 0 && (
            <p className="mt-1.5 text-caption text-warning-700 dark:text-warning-400">
              No hay servicios. Crea uno en la sección de servicios.
            </p>
          )}
        </Field>

        {depositAmount && (
          <DepositChoice
            amount={depositAmount}
            value={
              formData.deposit_waived
                ? "waived"
                : formData.deposit_status === "verified"
                  ? "verified"
                  : "pending"
            }
            onChange={(value: DepositChoiceValue) =>
              onChange({
                deposit_status: value === "verified" ? "verified" : undefined,
                deposit_waived: value === "waived",
              })
            }
          />
        )}

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
              // An empty nickname ("") used to render an empty chip
              const label =
                s.nickname?.trim() || `${s.first_name} ${s.last_name}`;
              return (
                <ChipButton
                  key={s.id}
                  selected={selected}
                  onClick={() => onChange({ staff_id: s.id })}
                >
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-[2px]"
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
        <SheetFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting || !formData.customer_id || services.length === 0
            }
            className="flex-1"
          >
            {isSubmitting ? "Guardando…" : "Crear turno"}
          </Button>
        </SheetFooter>
      </form>
    </Sheet>
  );
}

export function ChipButton({
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
      aria-pressed={selected}
      className={`flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-control border px-3.5 text-meta font-semibold text-foreground transition-colors ${
        selected
          ? "border-primary bg-primary-100 dark:bg-primary-900"
          : "border-border-2 bg-surface hover:bg-muted"
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
  onCancel: () => void | Promise<void>;
  onMarkNoShow?: () => void | Promise<void>;
  onEdit?: () => void;
  /** Verify, waive or refund the deposit (owner or admin). */
  onDeposit: (action: DepositAction) => void | Promise<void>;
  isDepositBusy?: boolean;
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
  onCancel,
  onMarkNoShow,
  onEdit,
  onDeposit,
  isDepositBusy = false,
  serviceColor,
  staffColor,
  isProcessing = false,
}: AppointmentDetailModalProps) {
  const { format: money } = useMoney();
  const status = (a.status ?? "pending") as AppointmentStatus;
  // A pending appointment waiting for its deposit is confirmed from the deposit panel
  const waitsForDeposit = status === "pending" && depositOpen(a.deposit_status);
  const next = waitsForDeposit ? null : NEXT_ACTIONS[status];
  // Opens a chat with the customer; the automatic reminders go on their own
  const whatsappUrl = a.customer_phone
    ? `https://wa.me/${toInternationalPhone(a.customer_phone).slice(1)}`
    : null;
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
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const isTerminal =
    status === "completed" || status === "cancelled" || status === "no_show";

  return (
    <Sheet open={open} onClose={onClose} title="Detalle del turno" hideTitle>
      {/* Customer header */}
      <div className="flex items-center gap-3">
        <Avatar name={customerName} seed={a.customer_id} size={52} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-title font-semibold tracking-[-0.01em] text-foreground">
            {customerName}
          </div>
          <div className="mt-[3px] font-mono text-meta tabular-nums text-foreground-muted">
            {a.customer_phone ? (
              <a
                href={`tel:${toInternationalPhone(a.customer_phone)}`}
                className="underline-offset-2 hover:underline"
              >
                {a.customer_phone}
              </a>
            ) : (
              "—"
            )}
          </div>
        </div>
        {/* The customer is already being attended: they did show up */}
        {!isTerminal && onMarkNoShow && status !== "in_progress" && (
          <KebabMenu
            items={[
              {
                label: "No vino",
                onClick: () => void onMarkNoShow(),
                disabled: isProcessing,
              },
            ]}
          />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-control bg-surface-2 text-foreground-muted transition-colors hover:text-foreground"
        >
          <X className="size-[18px]" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <StatusBadge status={status} className="!h-7 !text-meta" />
        {a.appointment_number && (
          <span className="font-mono text-caption tabular-nums text-foreground-subtle">
            N° {a.appointment_number}
          </span>
        )}
      </div>

      {/* Detail grid: the hairlines are the 1px gaps over the border colour */}
      <div className="mt-[18px] grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-border bg-border">
        <DetailItem label="Fecha" value={dateLabel} />
        <DetailItem label="Hora" value={`${startTime} – ${endTime}`} mono />
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
        <DetailItem label="Duración" value={fmtDuration(a.duration_minutes)} />
        <DetailItem
          label="Precio"
          value={a.service_price != null ? money(a.service_price) : "—"}
          mono
        />
      </div>

      {/* Notes */}
      {a.notes && (
        <div className="mt-3 rounded-[18px] border border-border px-3.5 py-3">
          <div className="text-caption text-foreground-subtle">Notas</div>
          <p className="mt-[3px] text-body text-foreground">{a.notes}</p>
        </div>
      )}

      <DepositPanel appointment={a} onAction={onDeposit} busy={isDepositBusy} />

      {/* Actions */}
      {!isTerminal && (
        <>
          {next && (
            <Button
              size="lg"
              onClick={() => onAdvance(next.to)}
              disabled={isProcessing}
              className="mt-[18px] w-full"
            >
              {LONG_ACTION[next.to] ?? next.label}
            </Button>
          )}
          {next && next.to !== "completed" && status !== "pending" && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onAdvance("completed")}
              disabled={isProcessing}
              className="mt-2 w-full"
            >
              Terminar
            </Button>
          )}
          <div className="mt-2 grid auto-cols-fr grid-flow-col gap-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={ACTION_TILE}
              >
                <MessageCircle className="size-[17px]" />
                WhatsApp
              </a>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                disabled={isProcessing}
                className={ACTION_TILE}
              >
                <CalendarClock className="size-[17px]" />
                Mover
              </button>
            )}
            <button
              type="button"
              onClick={() => void onCancel()}
              disabled={isProcessing}
              className={`${ACTION_TILE} !text-danger-600 dark:!text-danger-400`}
            >
              <X className="size-[17px]" />
              Cancelar
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

/** The main button spells the step out; the short label is for tight spots. */
const LONG_ACTION: Partial<Record<AppointmentStatus, string>> = {
  confirmed: "Confirmar",
  checked_in: "Marcar llegada",
  in_progress: "Empezar atención",
  completed: "Terminar",
};

const ACTION_TILE =
  "flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-[14px] border border-border-2 bg-surface text-meta font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

function DetailItem({
  label,
  value,
  dot,
  mono = false,
}: {
  label: string;
  value: string;
  dot?: string;
  /** Times and prices go in the mono face. */
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 bg-surface px-3.5 py-3">
      <div className="text-caption text-foreground-subtle">{label}</div>
      <div
        className={`mt-[3px] flex items-center gap-1.5 text-body font-medium text-foreground ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {dot && (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-[2px]"
            style={{ background: dot }}
          />
        )}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
