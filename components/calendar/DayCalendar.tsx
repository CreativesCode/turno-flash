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
        {/* Header: prev/next/today + weekday + date + count */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevDay}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-border-2 bg-surface text-foreground-muted transition-colors hover:bg-muted"
              aria-label="Día anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextDay}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-border-2 bg-surface text-foreground-muted transition-colors hover:bg-muted"
              aria-label="Día siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {!today && (
              <button
                onClick={goToToday}
                className="ml-1 h-9 cursor-pointer rounded-[10px] border border-border-2 bg-surface px-3 text-meta font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Hoy
              </button>
            )}
          </div>
          <div className="text-center">
            <div className="text-meta font-medium capitalize text-foreground-subtle">
              {weekday}
            </div>
            <div className="text-lead font-semibold text-foreground">
              {dayLabel}
            </div>
          </div>
          <div className="rounded-full bg-surface-2 px-2.5 py-1 text-caption font-medium text-foreground-muted">
            {dayAppointments.length} turno
            {dayAppointments.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Calendar body */}
        <Card className="overflow-hidden p-0">
          <div className="flex max-h-160 overflow-y-auto">
            {/* Hour rail */}
            <div className="w-12 shrink-0 border-r border-border pt-1">
              {hours.map((h) => (
                <div
                  key={h}
                  className="px-1.5 pt-1 text-right font-mono text-caption tabular-nums text-foreground-subtle"
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
                    className="relative border-t border-border"
                    style={{ height: HOUR_PX }}
                  >
                    {/* dotted half-hour separator */}
                    <div
                      className="absolute inset-x-0 border-t border-dashed border-border/50"
                      style={{ top: "50%" }}
                    />
                    {/* Click targets — hidden but cover top/bottom halves */}
                    {onTimeSlotClick && (
                      <>
                        <button
                          type="button"
                          onClick={() => onTimeSlotClick(slotTopHour)}
                          className="group absolute inset-x-0 top-0 cursor-pointer transition-colors hover:bg-muted"
                          style={{ height: HOUR_PX / 2 }}
                          aria-label={`Crear turno a las ${slotTopHour}`}
                        >
                          <Plus className="absolute right-2 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-foreground-subtle group-hover:block" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onTimeSlotClick(slotTopHalf)}
                          className="group absolute inset-x-0 bottom-0 cursor-pointer transition-colors hover:bg-muted"
                          style={{ height: HOUR_PX / 2 }}
                          aria-label={`Crear turno a las ${slotTopHalf}`}
                        >
                          <Plus className="absolute right-2 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-foreground-subtle group-hover:block" />
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
      className={`st-${status} absolute left-1.5 right-1.5 cursor-pointer overflow-hidden rounded-[10px] border-l-[3px] px-2 py-1.5`}
      style={{
        top,
        height,
        background: "var(--st-tint)",
        borderLeftColor: "var(--st-c)",
      }}
      onClick={() => onClick?.(appt)}
      role="button"
      tabIndex={0}
    >
      <div className="truncate font-mono text-caption tabular-nums text-foreground-muted">
        {time} · {fmtDuration(appt.duration_minutes)}
      </div>
      <div className="truncate text-meta font-semibold leading-tight text-foreground">
        {appt.customer_first_name} {appt.customer_last_name}
      </div>
      {showService && (
        <div className="truncate text-caption leading-tight text-foreground-muted">
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
      style={{ top, height: 0, borderTop: "1.5px solid var(--color-secondary)" }}
    >
      <span
        aria-hidden
        className="absolute size-2 rounded-full bg-secondary"
        style={{ left: -4, top: -5 }}
      />
      <span
        className="absolute rounded bg-surface px-1.5 py-px font-mono text-caption text-secondary-600 dark:text-secondary-400"
        style={{ right: 6, top: -10 }}
      >
        {label}
      </span>
    </div>
  );
}
