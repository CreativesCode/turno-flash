"use client";

import { BUSINESS_HOURS, getStatusCalendarColor } from "@/config/constants";
import { AppointmentWithDetails } from "@/types/appointments";
import { getLocalDateString, isToday } from "@/utils/date";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import React, { useCallback, useMemo } from "react";

interface DayCalendarProps {
  date: Date;
  appointments: AppointmentWithDetails[];
  onDateChange: (date: Date) => void;
  onAppointmentClick?: (appointment: AppointmentWithDetails) => void;
  onTimeSlotClick?: (time: string) => void;
  startHour?: number;
  endHour?: number;
}

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
    // Generate time slots
    const timeSlots = useMemo(() => {
      const slots: string[] = [];
      for (let hour = startHour; hour <= endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
      return slots;
    }, [startHour, endHour]);

    // Filter appointments for the current day
    const dayAppointments = useMemo(() => {
      const dateStr = getLocalDateString(date);
      return appointments.filter((apt) => apt.appointment_date === dateStr);
    }, [appointments, date]);

    // Calculate appointment position and height
    const getAppointmentStyle = (appointment: AppointmentWithDetails) => {
      const [startH, startM] = appointment.start_time.split(":").map(Number);
      const [endH, endM] = appointment.end_time.split(":").map(Number);

      const startMinutes = (startH - startHour) * 60 + startM;
      const endMinutes = (endH - startHour) * 60 + endM;
      const duration = endMinutes - startMinutes;

      const top = (startMinutes / 30) * 48; // 48px per 30min slot
      const height = Math.max((duration / 30) * 48, 24); // Minimum height

      return { top: `${top}px`, height: `${height}px` };
    };

    // Get status color (using helper from constants)
    const getStatusColor = getStatusCalendarColor;

    // Navigation - memoized callbacks
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

    // Format date - full version for desktop
    const formatDate = (d: Date) => {
      return d.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    // Format date - short version for mobile
    const formatDateShort = (d: Date) => {
      return d.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };

    return (
      <div className="rounded-lg bg-surface shadow-sm">
        {/* Header */}
        <div className="border-b border-border p-3 sm:p-4">
          {/* Mobile Layout */}
          <div className="flex flex-col gap-3 sm:hidden">
            {/* Top row: Navigation and Today button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPrevDay}
                  className="rounded-md p-1.5 hover:bg-muted"
                  aria-label="Día anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goToNextDay}
                  className="rounded-md p-1.5 hover:bg-muted"
                  aria-label="Día siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={goToToday}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    isToday(getLocalDateString(date))
                      ? "bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400"
                      : "bg-muted text-foreground hover:bg-subtle"
                  }`}
                >
                  Hoy
                </button>
              </div>
              <div className="text-xs font-medium text-foreground-muted">
                {dayAppointments.length} turno
                {dayAppointments.length !== 1 ? "s" : ""}
              </div>
            </div>
            {/* Date display */}
            <h2 className="text-base font-semibold capitalize text-foreground leading-tight">
              {formatDateShort(date)}
            </h2>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevDay}
                className="rounded-md p-2 hover:bg-muted"
                aria-label="Día anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToNextDay}
                className="rounded-md p-2 hover:bg-muted"
                aria-label="Día siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={goToToday}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  isToday(getLocalDateString(date))
                    ? "bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400"
                    : "bg-muted text-foreground hover:bg-subtle"
                }`}
              >
                Hoy
              </button>
            </div>
            <h2 className="text-lg font-semibold capitalize text-foreground">
              {formatDate(date)}
            </h2>
            <div className="text-sm text-foreground-muted">
              {dayAppointments.length} turno
              {dayAppointments.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="relative max-h-[600px] overflow-y-auto">
          <div className="relative">
            {/* Time Labels */}
            <div className="absolute left-0 top-0 w-16 border-r border-border bg-muted">
              {timeSlots.map((time, index) => (
                <div
                  key={time}
                  className="flex h-12 items-start justify-end pr-2 pt-1"
                >
                  {index % 2 === 0 && (
                    <span className="text-xs text-foreground-muted">
                      {time}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid Lines and Appointments */}
            <div className="ml-16 relative">
              {/* Grid Lines */}
              {timeSlots.map((time, index) => (
                <div
                  key={time}
                  onClick={() => onTimeSlotClick?.(time)}
                  className={`group h-12 border-b border-border ${
                    index % 2 === 0 ? "border-border" : ""
                  } ${
                    onTimeSlotClick
                      ? "cursor-pointer hover:bg-info-50 dark:hover:bg-info-900/10"
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
              {dayAppointments.map((appointment) => {
                const style = getAppointmentStyle(appointment);
                return (
                  <div
                    key={appointment.id}
                    onClick={() => onAppointmentClick?.(appointment)}
                    style={style}
                    className={`absolute left-1 right-1 rounded-md border-l-4 px-2 py-1 text-white shadow-sm cursor-pointer transition-transform hover:scale-[1.02] ${getStatusColor(
                      appointment.status
                    )}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {appointment.customer_first_name}{" "}
                          {appointment.customer_last_name}
                        </p>
                        <p className="truncate text-xs opacity-90">
                          {appointment.service_name}
                        </p>
                      </div>
                      <span className="ml-2 text-xs whitespace-nowrap">
                        {appointment.start_time}
                      </span>
                    </div>
                    {appointment.staff_first_name && (
                      <p className="truncate text-xs opacity-75 mt-1">
                        {appointment.staff_first_name}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Current Time Indicator */}
              {isToday(getLocalDateString(date)) && (
                <CurrentTimeIndicator startHour={startHour} />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
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
  }
);

// Current Time Indicator Component
function CurrentTimeIndicator({ startHour }: { startHour: number }) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  if (currentHour < startHour || currentHour > BUSINESS_HOURS.END_HOUR) {
    return null;
  }

  const minutesSinceStart = (currentHour - startHour) * 60 + currentMinutes;
  const top = (minutesSinceStart / 30) * 48;

  return (
    <div
      className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="h-3 w-3 rounded-full bg-danger-600" />
      <div className="flex-1 h-0.5 bg-danger-600" />
    </div>
  );
}
