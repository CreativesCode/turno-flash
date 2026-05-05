"use client";

import { Card } from "@/components/ui";
import { BUSINESS_HOURS } from "@/config/constants";
import { AppointmentWithDetails } from "@/types/appointments";
import { getLocalDateString, isToday } from "@/utils/date";
import { fmtDuration } from "@/utils/format";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import React, { useCallback, useMemo } from "react";

interface DayCalendarProps {
  date: Date;
  appointments: AppointmentWithDetails[];
  onDateChange: (date: Date) => void;
  onAppointmentClick?: (appointment: AppointmentWithDetails) => void;
  /**
   * Slot click. Granularity is 30 min — receives "HH:00" or "HH:30".
   */
  onTimeSlotClick?: (time: string) => void;
  startHour?: number;
  endHour?: number;
}

const HOUR_PX = 56;

export const DayCalendar = React.memo(
  function DayCalendar({
    date,
    appointments,
    onDateChange,
    onAppointmentClick,
    onTimeSlotClick,
    startHour = BUSINESS_HOURS.START_HOUR,
    endHour = BUSINESS_HOURS.END_HOUR,
  }: DayCalendarProps) {
    const hours = useMemo(() => {
      const arr: number[] = [];
      for (let h = startHour; h <= endHour; h++) arr.push(h);
      return arr;
    }, [startHour, endHour]);

    const dayAppointments = useMemo(() => {
      const dateStr = getLocalDateString(date);
      return appointments.filter((apt) => apt.appointment_date === dateStr);
    }, [appointments, date]);

    const goToPrevDay = useCallback(() => {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() - 1);
      onDateChange(newDate);
    }, [date, onDateChange]);

    const goToNextDay = useCallback(() => {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() + 1);
      onDateChange(newDate);
    }, [date, onDateChange]);

    const goToToday = useCallback(() => {
      onDateChange(new Date());
    }, [onDateChange]);

    const weekday = date.toLocaleDateString("es-ES", { weekday: "long" });
    const dayLabel = date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
    });
    const today = isToday(getLocalDateString(date));

    return (
      <div className="space-y-3">
        {/* Header: prev/next/today + uppercase weekday + big date + count */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevDay}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors hover:bg-muted"
              aria-label="Día anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextDay}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors hover:bg-muted"
              aria-label="Día siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {!today && (
              <button
                onClick={goToToday}
                className="ml-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Hoy
              </button>
            )}
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
              {weekday}
            </div>
            <div className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
              {dayLabel}
            </div>
          </div>
          <div className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-foreground-muted">
            {dayAppointments.length} turno
            {dayAppointments.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Calendar body */}
        <Card className="overflow-hidden p-0">
          <div className="flex max-h-160 overflow-y-auto">
            {/* Hour rail */}
            <div className="w-11 shrink-0 border-r border-border pt-1">
              {hours.map((h) => (
                <div
                  key={h}
                  className="px-1.5 pt-1 text-right text-[11px] font-semibold tabular-nums text-foreground-muted"
                  style={{ height: HOUR_PX }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Slots area */}
            <div className="relative flex-1 pt-1">
              {/* Hourly cells with dashed top + dotted half-hour line */}
              {hours.map((h) => {
                const slotTopHour = `${String(h).padStart(2, "0")}:00`;
                const slotTopHalf = `${String(h).padStart(2, "0")}:30`;
                return (
                  <div
                    key={h}
                    className="relative border-t border-dashed border-border"
                    style={{ height: HOUR_PX }}
                  >
                    {/* dotted half-hour separator */}
                    <div
                      className="absolute inset-x-0 border-t border-dotted border-border-2 opacity-60"
                      style={{ top: "50%" }}
                    />
                    {/* Click targets — hidden but cover top/bottom halves */}
                    {onTimeSlotClick && (
                      <>
                        <button
                          type="button"
                          onClick={() => onTimeSlotClick(slotTopHour)}
                          className="group absolute inset-x-0 top-0 cursor-pointer transition-colors hover:bg-info-50/60 dark:hover:bg-info-900/15"
                          style={{ height: HOUR_PX / 2 }}
                          aria-label={`Crear turno a las ${slotTopHour}`}
                        >
                          <Plus className="absolute right-2 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-info group-hover:block" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onTimeSlotClick(slotTopHalf)}
                          className="group absolute inset-x-0 bottom-0 cursor-pointer transition-colors hover:bg-info-50/60 dark:hover:bg-info-900/15"
                          style={{ height: HOUR_PX / 2 }}
                          aria-label={`Crear turno a las ${slotTopHalf}`}
                        >
                          <Plus className="absolute right-2 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-info group-hover:block" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Now indicator */}
              {today && <NowIndicator startHour={startHour} endHour={endHour} />}

              {/* Appointment blocks */}
              {dayAppointments.map((appt) => (
                <ApptBlock
                  key={appt.id}
                  appt={appt}
                  startHour={startHour}
                  onClick={onAppointmentClick}
                />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.date.getTime() === next.date.getTime() &&
      prev.appointments.length === next.appointments.length &&
      prev.appointments.every(
        (apt, i) =>
          apt.id === next.appointments[i]?.id &&
          apt.status === next.appointments[i]?.status &&
          apt.start_time === next.appointments[i]?.start_time &&
          apt.end_time === next.appointments[i]?.end_time
      ) &&
      prev.startHour === next.startHour &&
      prev.endHour === next.endHour &&
      prev.onDateChange === next.onDateChange &&
      prev.onAppointmentClick === next.onAppointmentClick &&
      prev.onTimeSlotClick === next.onTimeSlotClick
    );
  }
);

interface ApptBlockProps {
  appt: AppointmentWithDetails;
  startHour: number;
  onClick?: (a: AppointmentWithDetails) => void;
}

function ApptBlock({ appt, startHour, onClick }: ApptBlockProps) {
  const [sH, sM] = appt.start_time.split(":").map(Number);
  const [eH, eM] = appt.end_time.split(":").map(Number);
  const startMin = (sH - startHour) * 60 + sM;
  const durMin = Math.max(15, (eH - startHour) * 60 + eM - startMin);
  const top = 4 + (startMin / 60) * HOUR_PX;
  const height = (durMin / 60) * HOUR_PX - 2;

  const status = appt.status ?? "pending";
  const time = appt.start_time.length > 5 ? appt.start_time.slice(0, 5) : appt.start_time;
  const showService = height > 40;

  return (
    <div
      className={`st-${status} absolute left-1.5 right-1.5 cursor-pointer overflow-hidden rounded-md border-l-4 px-2 py-1 shadow-xs transition-transform hover:-translate-y-px`}
      style={{
        top,
        height,
        background: "var(--st-bg)",
        borderLeftColor: "var(--st-c)",
        color: "var(--st-cb)",
      }}
      onClick={() => onClick?.(appt)}
      role="button"
      tabIndex={0}
    >
      <div className="truncate text-[10px] font-bold tabular-nums">
        {time} · {fmtDuration(appt.duration_minutes)}
      </div>
      <div className="truncate text-[12px] font-bold leading-tight">
        {appt.customer_first_name} {appt.customer_last_name}
      </div>
      {showService && (
        <div className="truncate text-[11px] leading-tight opacity-90">
          {appt.service_name}
        </div>
      )}
    </div>
  );
}

function NowIndicator({
  startHour,
  endHour,
}: {
  startHour: number;
  endHour: number;
}) {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < startHour || h > endHour) return null;
  const top = 4 + ((h - startHour) * 60 + m) / 60 * HOUR_PX;
  const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10"
      style={{ top, height: 0, borderTop: "2px solid var(--color-secondary-500)" }}
    >
      <span
        aria-hidden
        className="absolute h-2.5 w-2.5 rounded-full bg-secondary-500"
        style={{ left: -6, top: -5, boxShadow: "var(--shadow-glow-secondary)" }}
      />
      <span
        className="absolute rounded bg-surface px-1.5 py-px text-[10px] font-bold text-secondary-500"
        style={{ right: 6, top: -10 }}
      >
        {label}
      </span>
    </div>
  );
}
