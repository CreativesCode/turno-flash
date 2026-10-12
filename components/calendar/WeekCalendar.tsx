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
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-border-2 bg-surface text-foreground-muted transition-colors hover:bg-muted"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextWeek}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-border-2 bg-surface text-foreground-muted transition-colors hover:bg-muted"
              aria-label="Semana siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {!containsToday && (
              <button
                onClick={goToToday}
                className="ml-1 h-9 cursor-pointer rounded-[10px] border border-border-2 bg-surface px-3 text-meta font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Hoy
              </button>
            )}
          </div>
          <h2 className="text-lead font-semibold text-foreground">
            {weekRangeLabel}
          </h2>
          <div className="rounded-full bg-surface-2 px-2.5 py-1 text-caption font-medium text-foreground-muted">
            {appointments.length} turno{appointments.length !== 1 ? "s" : ""}
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          {/* Day headers */}
          <div
            className="grid border-b border-border bg-surface"
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
                  <div className="text-caption font-medium capitalize text-foreground-subtle">
                    {day.toLocaleDateString("es-ES", { weekday: "short" })}
                  </div>
                  <div
                    className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-meta font-semibold tabular-nums ${
                      isCurrent
                        ? "bg-inverse text-inverse-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="mt-1 font-mono text-caption text-foreground-subtle">
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
                    className="border-t border-border pr-1 text-right font-mono text-caption tabular-nums text-foreground-subtle"
                    style={{ height: HOUR_PX, paddingTop: 2 }}
                  >
                    {String(h).padStart(2, "0")}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day) => {
                const dStr = getLocalDateString(day);
                const dayApts = appointmentsByDate.get(dStr) ?? [];

                return (
                  <div
                    key={dStr}
                    className="relative border-l border-border"
                  >
                    {/* Hour cells (click targets) */}
                    {hours.map((h) => {
                      const time = `${String(h).padStart(2, "0")}:00`;
                      return (
                        <div
                          key={`${dStr}-${h}`}
                          onClick={() => onTimeSlotClick?.(dStr, time)}
                          className={`group relative border-t border-border ${
                            onTimeSlotClick
                              ? "cursor-pointer hover:bg-muted"
                              : ""
                          }`}
                          style={{ height: HOUR_PX }}
                        >
                          {onTimeSlotClick && (
                            <Plus className="absolute right-1 top-1 hidden h-3 w-3 text-foreground-subtle group-hover:block" />
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
      className={`st-${status} absolute inset-x-0.5 cursor-pointer overflow-hidden rounded-[6px] border-l-2 px-1 py-0.5 font-mono text-caption font-medium tabular-nums text-foreground hover:z-10`}
      style={{
        top,
        height,
        background: "var(--st-tint)",
        borderLeftColor: "var(--st-c)",
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
