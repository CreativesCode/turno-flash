"use client";

import { Card } from "@/components/ui";
import { BUSINESS_HOURS } from "@/config/constants";
import { AppointmentWithDetails } from "@/types/appointments";
import { getLocalDateString, getStartOfWeek, getWeekDays } from "@/utils/date";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import React, { useCallback, useMemo } from "react";

interface WeekCalendarProps {
  date: Date;
  appointments: AppointmentWithDetails[];
  onDateChange: (date: Date) => void;
  onAppointmentClick?: (appointment: AppointmentWithDetails) => void;
  onTimeSlotClick?: (date: string, time: string) => void;
  startHour?: number;
  endHour?: number;
}

const HOUR_PX = 40;
const RAIL_W = 36;

export const WeekCalendar = React.memo(
  function WeekCalendar({
    date,
    appointments,
    onDateChange,
    onAppointmentClick,
    onTimeSlotClick,
    startHour = BUSINESS_HOURS.START_HOUR,
    endHour = BUSINESS_HOURS.END_HOUR,
  }: WeekCalendarProps) {
    const { startOfWeek, weekDays } = useMemo(() => {
      const start = getStartOfWeek(date);
      const days = getWeekDays(date);
      return { startOfWeek: start, weekDays: days };
    }, [date]);

    const hours = useMemo(() => {
      const arr: number[] = [];
      for (let h = startHour; h <= endHour; h++) arr.push(h);
      return arr;
    }, [startHour, endHour]);

    const appointmentsByDate = useMemo(() => {
      const map = new Map<string, AppointmentWithDetails[]>();
      appointments.forEach((apt) => {
        const arr = map.get(apt.appointment_date) ?? [];
        arr.push(apt);
        map.set(apt.appointment_date, arr);
      });
      return map;
    }, [appointments]);

    const goToPrevWeek = useCallback(() => {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() - 7);
      onDateChange(newDate);
    }, [date, onDateChange]);

    const goToNextWeek = useCallback(() => {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() + 7);
      onDateChange(newDate);
    }, [date, onDateChange]);

    const goToToday = useCallback(() => {
      onDateChange(new Date());
    }, [onDateChange]);

    const today = getLocalDateString();
    const containsToday = weekDays.some((d) => getLocalDateString(d) === today);

    const weekRangeLabel = useMemo(() => {
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const startMonth = startOfWeek.toLocaleDateString("es-ES", {
        month: "short",
      });
      const endMonth = endOfWeek.toLocaleDateString("es-ES", { month: "short" });
      if (startMonth === endMonth) {
        return `${startOfWeek.getDate()} — ${endOfWeek.getDate()} ${startMonth}`;
      }
      return `${startOfWeek.getDate()} ${startMonth} — ${endOfWeek.getDate()} ${endMonth}`;
    }, [startOfWeek]);

    const gridCols = `${RAIL_W}px repeat(7, 1fr)`;

    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevWeek}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors hover:bg-muted"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextWeek}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors hover:bg-muted"
              aria-label="Semana siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {!containsToday && (
              <button
                onClick={goToToday}
                className="ml-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Hoy
              </button>
            )}
          </div>
          <h2 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
            {weekRangeLabel}
          </h2>
          <div className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-foreground-muted">
            {appointments.length} turno{appointments.length !== 1 ? "s" : ""}
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          {/* Day headers */}
          <div
            className="grid border-b border-border bg-surface-2"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div />
            {weekDays.map((day) => {
              const dStr = getLocalDateString(day);
              const isCurrent = dStr === today;
              const dayApts = appointmentsByDate.get(dStr) ?? [];
              return (
                <div
                  key={dStr}
                  className="border-l border-border py-2 text-center"
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider text-foreground-muted">
                    {day.toLocaleDateString("es-ES", { weekday: "short" })}
                  </div>
                  <div
                    className={`mx-auto mt-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold tabular-nums ${
                      isCurrent
                        ? "bg-primary-500 text-white"
                        : "text-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="mt-1 text-[9px] text-foreground-subtle">
                    {dayApts.length || "—"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid body */}
          <div className="max-h-160 overflow-y-auto">
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: gridCols,
                minHeight: hours.length * HOUR_PX,
              }}
            >
              {/* Hour rail */}
              <div>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="border-t border-dashed border-border pr-1 text-right text-[9px] font-semibold tabular-nums text-foreground-muted"
                    style={{ height: HOUR_PX, paddingTop: 2 }}
                  >
                    {String(h).padStart(2, "0")}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day) => {
                const dStr = getLocalDateString(day);
                const isCurrent = dStr === today;
                const dayApts = appointmentsByDate.get(dStr) ?? [];

                return (
                  <div
                    key={dStr}
                    className="relative border-l border-border"
                    style={{
                      background: isCurrent
                        ? "rgba(34, 197, 94, 0.04)"
                        : "transparent",
                    }}
                  >
                    {/* Hour cells (click targets) */}
                    {hours.map((h) => {
                      const time = `${String(h).padStart(2, "0")}:00`;
                      return (
                        <div
                          key={`${dStr}-${h}`}
                          onClick={() => onTimeSlotClick?.(dStr, time)}
                          className={`group relative border-t border-dashed border-border ${
                            onTimeSlotClick
                              ? "cursor-pointer hover:bg-info-50/60 dark:hover:bg-info-900/15"
                              : ""
                          }`}
                          style={{ height: HOUR_PX }}
                        >
                          {onTimeSlotClick && (
                            <Plus className="absolute right-1 top-1 hidden h-3 w-3 text-info group-hover:block" />
                          )}
                        </div>
                      );
                    })}

                    {/* Appointments */}
                    {dayApts.map((appt) => (
                      <ApptBlock
                        key={appt.id}
                        appt={appt}
                        startHour={startHour}
                        onClick={onAppointmentClick}
                      />
                    ))}
                  </div>
                );
              })}
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
  const top = (startMin / 60) * HOUR_PX;
  const height = Math.max((durMin / 60) * HOUR_PX - 1, 12);
  const status = appt.status ?? "pending";
  const time =
    appt.start_time.length > 5 ? appt.start_time.slice(0, 5) : appt.start_time;

  return (
    <div
      className={`st-${status} absolute inset-x-0.5 cursor-pointer overflow-hidden rounded border-l-2 px-1 py-0.5 text-[8px] font-bold tabular-nums shadow-xs transition-transform hover:z-10 hover:scale-[1.02]`}
      style={{
        top,
        height,
        background: "var(--st-bg)",
        borderLeftColor: "var(--st-c)",
        color: "var(--st-cb)",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(appt);
      }}
      role="button"
      tabIndex={0}
    >
      {time}
    </div>
  );
}
