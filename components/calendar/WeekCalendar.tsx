"use client";

import { AppointmentWithDetails } from "@/types/appointments";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo } from "react";

interface WeekCalendarProps {
  date: Date;
  appointments: AppointmentWithDetails[];
  onDateChange: (date: Date) => void;
  onAppointmentClick?: (appointment: AppointmentWithDetails) => void;
  onTimeSlotClick?: (date: string, time: string) => void;
  startHour?: number;
  endHour?: number;
}

export function WeekCalendar({
  date,
  appointments,
  onDateChange,
  onAppointmentClick,
  onTimeSlotClick,
  startHour = 8,
  endHour = 20,
}: WeekCalendarProps) {
  // Get start of week (Monday)
  const startOfWeek = useMemo(() => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [date]);

  // Generate week days
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [startOfWeek]);

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

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "client_confirmed":
        return "bg-green-500 border-green-600";
      case "pending":
        return "bg-yellow-500 border-yellow-600";
      case "completed":
        return "bg-blue-500 border-blue-600";
      case "cancelled":
      case "no_show":
        return "bg-red-400 border-red-500";
      case "checked_in":
      case "in_progress":
        return "bg-purple-500 border-purple-600";
      default:
        return "bg-zinc-500 border-zinc-600";
    }
  };

  // Navigation
  const goToPrevWeek = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

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

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNextWeek}
            className="rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={goToToday}
            className="rounded-md px-3 py-1 text-sm font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Hoy
          </button>
        </div>
        <h2 className="text-lg font-semibold capitalize text-black dark:text-zinc-50">
          {formatWeekRange()}
        </h2>
        <div className="text-sm text-zinc-500">
          {appointments.length} turno{appointments.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-8 border-b border-zinc-200 dark:border-zinc-700">
        <div className="w-16 border-r border-zinc-200 dark:border-zinc-700" />
        {weekDays.map((day) => {
          const dateStr = day.toISOString().split("T")[0];
          const isCurrentDay = dateStr === today;
          const dayApts = appointmentsByDate.get(dateStr) || [];

          return (
            <div
              key={dateStr}
              className={`flex flex-col items-center py-2 ${
                isCurrentDay
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : "bg-zinc-50 dark:bg-zinc-900/50"
              }`}
            >
              <span className="text-xs text-zinc-500 uppercase">
                {day.toLocaleDateString("es-ES", { weekday: "short" })}
              </span>
              <span
                className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  isCurrentDay
                    ? "bg-blue-600 text-white"
                    : "text-black dark:text-zinc-50"
                }`}
              >
                {day.getDate()}
              </span>
              <span className="mt-1 text-xs text-zinc-400">
                {dayApts.length} turno{dayApts.length !== 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div className="max-h-[500px] overflow-y-auto">
        <div className="grid grid-cols-8">
          {/* Time Labels */}
          <div className="w-16 border-r border-zinc-200 dark:border-zinc-700">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="flex h-[60px] items-start justify-end pr-2 pt-1 border-b border-zinc-100 dark:border-zinc-800"
              >
                <span className="text-xs text-zinc-500">{time}</span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDays.map((day) => {
            const dateStr = day.toISOString().split("T")[0];
            const dayApts = appointmentsByDate.get(dateStr) || [];
            const isCurrentDay = dateStr === today;

            return (
              <div
                key={dateStr}
                className={`relative border-r border-zinc-100 dark:border-zinc-800 ${
                  isCurrentDay ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                }`}
              >
                {/* Grid Lines */}
                {timeSlots.map((time) => (
                  <div
                    key={`${dateStr}-${time}`}
                    onClick={() => onTimeSlotClick?.(dateStr, time)}
                    className={`h-[60px] border-b border-zinc-100 dark:border-zinc-800 ${
                      onTimeSlotClick
                        ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 group"
                        : ""
                    }`}
                  >
                    {onTimeSlotClick && (
                      <div className="hidden group-hover:flex items-center justify-center h-full">
                        <Plus className="h-4 w-4 text-blue-500" />
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
}
