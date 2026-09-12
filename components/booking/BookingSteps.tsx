"use client";

import { Avatar, Button, Field, sheetInputClasses } from "@/components/ui";
import { PHONE_COUNTRIES, dialCodeOf } from "@/config/phone-countries";
import { usePublicSlots } from "@/hooks/usePublicBooking.query";
import {
  publicCustomerSchema,
  type PublicCustomerInput,
} from "@/schemas/public-booking.schema";
import type { PublicService, PublicSlot, PublicStaff } from "@/types/public-booking";
import { fmtDuration, fmtMoney } from "@/utils/format";
import { addDays, format, getDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronRight, Shuffle } from "lucide-react";
import { FormEvent, useState } from "react";

/** Max day chips shown, even if the service allows booking further ahead. */
const MAX_VISIBLE_DAYS = 30;

// ─── Service ──────────────────────────────────────────────

export function ServiceStep({
  services,
  onSelect,
}: {
  services: PublicService[];
  onSelect: (service: PublicService) => void;
}) {
  if (services.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-foreground-muted">
        Este negocio todavía no tiene servicios disponibles online.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {services.map((service) => (
        <li key={service.id}>
          <button
            type="button"
            onClick={() => onSelect(service)}
            className="flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-border bg-surface p-3.5 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <span
              aria-hidden
              className="h-10 w-1.5 shrink-0 rounded-full"
              style={{ background: service.color ?? "#3b82f6" }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">
                {service.name}
              </span>
              {service.description && (
                <span className="mt-0.5 line-clamp-2 block text-xs text-foreground-muted">
                  {service.description}
                </span>
              )}
              <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-foreground-muted">
                <span>{fmtDuration(service.duration_minutes)}</span>
                {service.price != null && (
                  <span className="font-semibold text-foreground">
                    {fmtMoney(service.price)}
                  </span>
                )}
                {service.requires_approval && (
                  <span className="rounded-full bg-warning-100 px-1.5 py-px text-[10px] font-bold text-warning-700 dark:bg-warning-900/30 dark:text-warning-400">
                    Sujeto a aprobación
                  </span>
                )}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-foreground-subtle" />
          </button>
        </li>
      ))}
    </ul>
  );
}

// ─── Staff ────────────────────────────────────────────────

export function StaffStep({
  staff,
  onSelect,
}: {
  staff: PublicStaff[];
  onSelect: (staffId: string | null) => void;
}) {
  const optionClasses =
    "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left shadow-sm transition-shadow hover:shadow-md";

  return (
    <ul className="flex flex-col gap-2">
      <li>
        <button type="button" onClick={() => onSelect(null)} className={optionClasses}>
          <span className="mesh-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white">
            <Shuffle className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">Sin preferencia</span>
            <span className="block text-xs text-foreground-muted">
              Te asignamos el primer profesional libre
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-foreground-subtle" />
        </button>
      </li>
      {staff.map((member) => (
        <li key={member.id}>
          <button type="button" onClick={() => onSelect(member.id)} className={optionClasses}>
            <Avatar name={member.name} color={member.color ?? undefined} size={40} />
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
              {member.name}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-foreground-subtle" />
          </button>
        </li>
      ))}
    </ul>
  );
}

// ─── Date & time ──────────────────────────────────────────

export function DateTimeStep({
  slug,
  service,
  staffId,
  staff,
  today,
  allowSameDay,
  date,
  onDateChange,
  onSelect,
}: {
  slug: string;
  service: PublicService;
  staffId: string | null;
  /** Staff members that can take this service */
  staff: PublicStaff[];
  today: string;
  allowSameDay: boolean;
  date: string | null;
  onDateChange: (date: string) => void;
  onSelect: (date: string, slot: PublicSlot) => void;
}) {
  const candidates = staffId ? staff.filter((s) => s.id === staffId) : staff;
  const workDays = new Set(candidates.flatMap((s) => s.work_days ?? []));

  const lastOffset = Math.min(service.max_advance_booking_days, MAX_VISIBLE_DAYS);
  const days: { value: string; weekday: string; day: string }[] = [];
  for (let offset = allowSameDay ? 0 : 1; offset <= lastOffset; offset++) {
    const d = addDays(parseISO(today), offset);
    if (!workDays.has(getDay(d))) continue;
    days.push({
      value: format(d, "yyyy-MM-dd"),
      weekday: offset === 0 ? "Hoy" : format(d, "EEE", { locale: es }),
      day: format(d, "d MMM", { locale: es }),
    });
  }

  // Derived, not synced: the first available day until the customer picks one
  const activeDate = date ?? days[0]?.value ?? null;
  const { data: slots = [], isLoading, error } = usePublicSlots({
    slug,
    serviceId: service.id,
    staffId,
    date: activeDate,
  });

  if (days.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-foreground-muted">
        No hay días disponibles para reservar por ahora.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="scrollbar-discreet -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const selected = d.value === activeDate;
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => onDateChange(d.value)}
              aria-pressed={selected}
              className={`flex min-w-16 shrink-0 cursor-pointer flex-col items-center rounded-xl border px-3 py-2 transition-colors ${
                selected
                  ? "border-primary-500 bg-primary-500 text-white"
                  : "border-border bg-surface text-foreground hover:border-border-2"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                {d.weekday}
              </span>
              <span className="text-sm font-bold">{d.day}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-danger-600">{error.message}</p>
      ) : slots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-foreground-muted">
          No quedan horarios libres este día. Prueba con otro.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.start_time}
              type="button"
              onClick={() => activeDate && onSelect(activeDate, slot)}
              className="h-10 cursor-pointer rounded-lg border border-border bg-surface text-sm font-semibold text-foreground transition-colors hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            >
              {slot.start_time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Customer details ─────────────────────────────────────

export interface CustomerSubmit extends PublicCustomerInput {
  /** Honeypot value (must be empty for humans) */
  website: string;
}

export function DetailsStep({
  defaultCountry,
  isSubmitting,
  onSubmit,
}: {
  /** ISO code preselected in the phone country picker */
  defaultCountry: string;
  isSubmitting: boolean;
  onSubmit: (data: CustomerSubmit) => void;
}) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    country: defaultCountry,
    phone: "",
    email: "",
    notes: "",
    website: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const patch = (p: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...p }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = publicCustomerSchema.safeParse({
      ...form,
      country_code: dialCodeOf(form.country),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit({ ...parsed.data, website: form.website });
  };

  const fieldError = (key: string) =>
    errors[key] && <p className="mt-1 text-[11px] text-danger-600">{errors[key]}</p>;

  return (
    <form onSubmit={handleSubmit} className="relative flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre">
          <input
            type="text"
            autoComplete="given-name"
            value={form.first_name}
            onChange={(e) => patch({ first_name: e.target.value })}
            className={sheetInputClasses}
          />
          {fieldError("first_name")}
        </Field>
        <Field label="Apellido">
          <input
            type="text"
            autoComplete="family-name"
            value={form.last_name}
            onChange={(e) => patch({ last_name: e.target.value })}
            className={sheetInputClasses}
          />
          {fieldError("last_name")}
        </Field>
      </div>

      <Field label="Teléfono (WhatsApp)" hint="Lo usamos por WhatsApp para confirmarte el turno.">
        <div className="flex gap-2">
          {/* Compact visible value; the transparent native select on top keeps
              the phone's own picker, which lists full country names */}
          <div className="relative flex w-28 shrink-0 items-center justify-between gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors has-[select:focus]:border-info-500 has-[select:focus]:ring-1 has-[select:focus]:ring-info-500">
            <span className="font-medium">
              {form.country} {dialCodeOf(form.country)}
            </span>
            <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-foreground-subtle" />
            <select
              value={form.country}
              onChange={(e) => patch({ country: e.target.value })}
              aria-label="País del teléfono"
              className="absolute inset-0 h-full w-full cursor-pointer bg-surface text-foreground opacity-0"
            >
              {PHONE_COUNTRIES.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.name} ({c.dialCode})
                </option>
              ))}
            </select>
          </div>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={form.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            placeholder="Número de celular"
            className={`${sheetInputClasses} min-w-0 flex-1`}
          />
        </div>
        {fieldError("phone")}
      </Field>

      <Field label="Email (opcional)">
        <input
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => patch({ email: e.target.value })}
          className={sheetInputClasses}
        />
        {fieldError("email")}
      </Field>

      <Field label="Nota para el negocio (opcional)">
        <textarea
          rows={2}
          maxLength={500}
          value={form.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          className={sheetInputClasses}
        />
        {fieldError("notes")}
      </Field>

      {/* Honeypot: invisible for people, bots fill it and get silently ignored */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={form.website}
        onChange={(e) => patch({ website: e.target.value })}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <Button
        type="submit"
        variant="mesh-primary"
        size="lg"
        disabled={isSubmitting}
        className="w-full justify-center"
      >
        {isSubmitting ? "Reservando…" : "Confirmar reserva"}
      </Button>
    </form>
  );
}
