"use client";

import {
  APPOINTMENT_STATUS,
  BUSINESS_HOURS,
  getStatusCalendarColor,
} from "@/config/constants";
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

export const WeekCalendar = React.memo(function WeekCalendar({
  date,
  appointments,
  onDateChange,
  onAppointmentClick,
  onTimeSlotClick,
  startHour = 8,
  endHour = 20,
}: WeekCalendarProps) {
  // Get start of week (Monday) and generate week days
  const { startOfWeek, weekDays } = useMemo(() => {
    const start = getStartOfWeek(date);
    const days = getWeekDays(date);
    return { startOfWeek: start, weekDays: days };
  }, [date]);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    }
    return slots;
  }, [startHour, endHour]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, AppointmentWithDetails[]>();
    appointments.forEach((apt) => {
      const dateStr = apt.appointment_date;
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(apt);
    });
    return map;
  }, [appointments]);

  // Calculate appointment position and height
  const getAppointmentStyle = (appointment: AppointmentWithDetails) => {
    const [startH, startM] = appointment.start_time.split(":").map(Number);
    const [endH, endM] = appointment.end_time.split(":").map(Number);

    const startMinutes = (startH - startHour) * 60 + startM;
    const endMinutes = (endH - startHour) * 60 + endM;
    const duration = endMinutes - startMinutes;

    const top = (startMinutes / 60) * 60; // 60px per hour
    const height = Math.max((duration / 60) * 60, 20); // Minimum height

    return { top: `${top}px`, height: `${height}px` };
  };

  // Get status color (using helper from constants)
  const getStatusColor = getStatusCalendarColor;

  // Navigation - memoized callbacks
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

  // Format header
  const formatWeekRange = () => {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startMonth = startOfWeek.toLocaleDateString("es-ES", {
      month: "short",
    });
    const endMonth = endOfWeek.toLocaleDateString("es-ES", { month: "short" });

    if (startMonth === endMonth) {
      return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${startMonth} ${startOfWeek.getFullYear()}`;
    }
    return `${startOfWeek.getDate()} ${startMonth} - ${endOfWeek.getDate()} ${endMonth} ${endOfWeek.getFullYear()}`;
  };

  const today = getLocalDateString();

  return (
    <div className="rounded-lg bg-surface shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="rounded-md p-2 hover:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNextWeek}
            className="rounded-md p-2 hover:bg-muted"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={goToToday}
            className="rounded-md px-3 py-1 text-sm font-medium bg-muted text-foreground hover:bg-subtle"
          >
            Hoy
          </button>
        </div>
        <h2 className="text-lg font-semibold capitalize text-foreground">
          {formatWeekRange()}
        </h2>
        <div className="text-sm text-foreground-muted">
          {appointments.length} turno{appointments.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Day Headers */}
      <div
        className="grid border-b border-border"
        style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}
      >
        <div className="border-r border-border" />
        {weekDays.map((day) => {
          const dateStr = getLocalDateString(day);
          const isCurrentDay = dateStr === today;
          const dayApts = appointmentsByDate.get(dateStr) || [];

          return (
            <div
              key={dateStr}
              className={`flex flex-col items-center py-2 ${
                isCurrentDay
                  ? "bg-info-50 dark:bg-info-900/20"
                  : "bg-muted dark:bg-zinc-900/50"
              }`}
            >
              <span className="text-xs text-foreground-muted uppercase">
                {day.toLocaleDateString("es-ES", { weekday: "short" })}
              </span>
              <span
                className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  isCurrentDay
                    ? "bg-info text-info-foreground"
                    : "text-foreground"
                }`}
              >
                {day.getDate()}
              </span>
              <span className="mt-1 text-xs text-foreground-muted">
                {dayApts.length} turno{dayApts.length !== 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div className="max-h-[500px] overflow-y-auto">
        <div
          className="grid"
          style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}
        >
          {/* Time Labels */}
          <div className="border-r border-border">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="flex h-[60px] items-start justify-end pr-2 pt-1 border-b border-border"
              >
                <span className="text-xs text-foreground-muted">{time}</span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDays.map((day) => {
            const dateStr = getLocalDateString(day);
            const dayApts = appointmentsByDate.get(dateStr) || [];
            const isCurrentDay = dateStr === today;

            return (
              <div
                key={dateStr}
                className={`relative border-r border-border ${
                  isCurrentDay ? "bg-info-50/30 dark:bg-info-900/10" : ""
                }`}
              >
                {/* Grid Lines */}
                {timeSlots.map((time) => (
                  <div
                    key={`${dateStr}-${time}`}
                    onClick={() => onTimeSlotClick?.(dateStr, time)}
                    className={`h-[60px] border-b border-border ${
                      onTimeSlotClick
                        ? "cursor-pointer hover:bg-info-50 dark:hover:bg-info-900/20 group"
                        : ""
                    }`}
                  >
                    {onTimeSlotClick && (
                      <div className="hidden group-hover:flex items-center justify-center h-full">
                        <Plus className="h-4 w-4 text-info" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Appointments */}
                {dayApts.map((appointment) => {
                  const style = getAppointmentStyle(appointment);
                  return (
                    <div
                      key={appointment.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick?.(appointment);
                      }}
                      style={style}
                      className={`absolute left-0.5 right-0.5 rounded border-l-2 px-1 py-0.5 text-white shadow-sm cursor-pointer transition-transform hover:scale-[1.02] hover:z-10 ${getStatusColor(
                        appointment.status
                      )}`}
                    >
                      <p className="truncate text-xs font-medium leading-tight">
                        {appointment.customer_first_name}
                      </p>
                      <p className="truncate text-[10px] opacity-90 leading-tight">
                        {appointment.start_time}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.date.getTime() === nextProps.date.getTime() &&
    prevProps.appointments.length === nextProps.appointments.length &&
    prevProps.appointments.every(
      (apt, idx) =>
        apt.id === nextProps.appointments[idx]?.id &&
        apt.status === nextProps.appointments[idx]?.status
    ) &&
    prevProps.startHour === nextProps.startHour &&
    prevProps.endHour === nextProps.endHour &&
    prevProps.onDateChange === nextProps.onDateChange &&
    prevProps.onAppointmentClick === nextProps.onAppointmentClick &&
    prevProps.onTimeSlotClick === nextProps.onTimeSlotClick
  );
});
