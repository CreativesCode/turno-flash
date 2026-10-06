"use client";

import { ChipButton } from "@/components/appointments/AppointmentModal";
import {
  Button,
  Field,
  Sheet,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import type {
  AppointmentWithDetails,
  StaffMember,
} from "@/types/appointments";
import { FormEvent, useState } from "react";

export interface RescheduleInput {
  appointment_date: string;
  start_time: string;
  end_time: string;
  staff_id: string | null;
}

interface AppointmentRescheduleSheetProps {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentWithDetails;
  staff: StaffMember[];
  onSubmit: (input: RescheduleInput) => void;
  isSubmitting: boolean;
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;

/**
 * Move an appointment to another date, time or professional (P1-03). The
 * duration stays the same; the customer gets a WhatsApp and is asked to
 * confirm again (migration 062).
 */
export function AppointmentRescheduleSheet({
  open,
  onClose,
  appointment,
  staff,
  onSubmit,
  isSubmitting,
}: AppointmentRescheduleSheetProps) {
  const [date, setDate] = useState(appointment.appointment_date);
  const [startTime, setStartTime] = useState(
    appointment.start_time.slice(0, 5)
  );
  const [staffId, setStaffId] = useState<string | null>(appointment.staff_id);

  const duration =
    toMinutes(appointment.end_time) - toMinutes(appointment.start_time);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      appointment_date: date,
      start_time: startTime,
      end_time: toTime(toMinutes(startTime) + duration),
      staff_id: staffId,
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Mover turno">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Hora">
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClasses}
            />
          </Field>
        </div>

        <Field label="Profesional">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <ChipButton selected={!staffId} onClick={() => setStaffId(null)}>
              Cualquiera
            </ChipButton>
            {staff.map((s) => (
              <ChipButton
                key={s.id}
                selected={staffId === s.id}
                onClick={() => setStaffId(s.id)}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: s.color ?? "#94a3b8" }}
                />
                {s.nickname ?? `${s.first_name} ${s.last_name}`}
              </ChipButton>
            ))}
          </div>
        </Field>

        <p className="rounded-md bg-muted px-3 py-2 text-xs text-foreground-muted">
          Si el WhatsApp del negocio está conectado, le avisamos al cliente
          del nuevo horario y le pedimos que confirme de nuevo.
        </p>

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
            disabled={isSubmitting}
            className="flex-2 justify-center"
          >
            {isSubmitting ? "Guardando…" : "Mover turno"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
