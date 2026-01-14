/**
 * Constants and Configuration
 * 
 * Centralized constants for the application to avoid hardcoded values
 * and improve maintainability.
 */

/**
 * Appointment Status Constants
 */
export const APPOINTMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  REMINDED: "reminded",
  CLIENT_CONFIRMED: "client_confirmed",
  CHECKED_IN: "checked_in",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
  RESCHEDULED: "rescheduled",
} as const;

/**
 * Appointment Source Constants
 */
export const APPOINTMENT_SOURCE = {
  WEB: "web",
  WHATSAPP: "whatsapp",
  PHONE: "phone",
  WALK_IN: "walk_in",
  ADMIN: "admin",
} as const;

/**
 * Status Colors for Badges (Light/Dark mode support)
 */
export const STATUS_COLORS = {
  badge: {
    [APPOINTMENT_STATUS.PENDING]: "bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400",
    [APPOINTMENT_STATUS.CONFIRMED]: "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400",
    [APPOINTMENT_STATUS.CLIENT_CONFIRMED]: "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400",
    [APPOINTMENT_STATUS.REMINDED]: "bg-secondary-100 text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-400",
    [APPOINTMENT_STATUS.COMPLETED]: "bg-info-100 text-info-800 dark:bg-info-900/20 dark:text-info-400",
    [APPOINTMENT_STATUS.CANCELLED]: "bg-danger-100 text-danger-800 dark:bg-danger-900/20 dark:text-danger-400",
    [APPOINTMENT_STATUS.NO_SHOW]: "bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400",
    [APPOINTMENT_STATUS.CHECKED_IN]: "bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400",
    [APPOINTMENT_STATUS.IN_PROGRESS]: "bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400",
    [APPOINTMENT_STATUS.RESCHEDULED]: "bg-muted text-muted-foreground",
    default: "bg-muted text-muted-foreground",
  },
  calendar: {
    [APPOINTMENT_STATUS.PENDING]: "bg-warning-600 border-warning-700",
    [APPOINTMENT_STATUS.CONFIRMED]: "bg-success-600 border-success-700",
    [APPOINTMENT_STATUS.CLIENT_CONFIRMED]: "bg-success-600 border-success-700",
    [APPOINTMENT_STATUS.COMPLETED]: "bg-info-600 border-info-700",
    [APPOINTMENT_STATUS.CANCELLED]: "bg-danger-600 border-danger-700",
    [APPOINTMENT_STATUS.NO_SHOW]: "bg-danger-600 border-danger-700",
    [APPOINTMENT_STATUS.CHECKED_IN]: "bg-primary-600 border-primary-700",
    [APPOINTMENT_STATUS.IN_PROGRESS]: "bg-primary-600 border-primary-700",
    default: "bg-foreground-muted border-border text-white",
  },
  reminder: {
    [APPOINTMENT_STATUS.CONFIRMED]: "bg-green-100 text-green-800",
    [APPOINTMENT_STATUS.REMINDED]: "bg-blue-100 text-blue-800",
    [APPOINTMENT_STATUS.PENDING]: "bg-yellow-100 text-yellow-800",
  },
} as const;

/**
 * Status Labels (with emojis)
 */
export const STATUS_LABELS = {
  [APPOINTMENT_STATUS.PENDING]: "⏳ Pendiente",
  [APPOINTMENT_STATUS.CONFIRMED]: "✓ Confirmado",
  [APPOINTMENT_STATUS.REMINDED]: "🔔 Recordado",
  [APPOINTMENT_STATUS.CLIENT_CONFIRMED]: "👤 Cliente Confirmó",
  [APPOINTMENT_STATUS.CHECKED_IN]: "📍 Check-in",
  [APPOINTMENT_STATUS.IN_PROGRESS]: "🚀 En Progreso",
  [APPOINTMENT_STATUS.COMPLETED]: "✅ Completado",
  [APPOINTMENT_STATUS.CANCELLED]: "❌ Cancelado",
  [APPOINTMENT_STATUS.NO_SHOW]: "⚠️ No Asistió",
  [APPOINTMENT_STATUS.RESCHEDULED]: "🔄 Reagendado",
} as const;

/**
 * Status Labels (without emojis, for reminders page)
 */
export const STATUS_LABELS_SIMPLE = {
  [APPOINTMENT_STATUS.PENDING]: "Pendiente",
  [APPOINTMENT_STATUS.CONFIRMED]: "Confirmado",
  [APPOINTMENT_STATUS.REMINDED]: "Recordado",
} as const;

/**
 * Business Hours Configuration
 */
export const BUSINESS_HOURS = {
  START: "08:00",
  END: "20:00",
  START_HOUR: 8,
  END_HOUR: 20,
  INTERVAL_MINUTES: 30,
} as const;

/**
 * Filter Status Options
 */
export const FILTER_STATUS = {
  ALL: "all",
  PENDING: APPOINTMENT_STATUS.PENDING,
  CONFIRMED: APPOINTMENT_STATUS.CONFIRMED,
  COMPLETED: APPOINTMENT_STATUS.COMPLETED,
  CANCELLED: APPOINTMENT_STATUS.CANCELLED,
} as const;

/**
 * Helper function to get status badge color
 */
export function getStatusBadgeColor(status: string | null): string {
  if (!status) {
    return STATUS_COLORS.badge.default;
  }
  return STATUS_COLORS.badge[status as keyof typeof STATUS_COLORS.badge] || STATUS_COLORS.badge.default;
}

/**
 * Helper function to get status calendar color
 */
export function getStatusCalendarColor(status: string | null): string {
  if (!status) {
    return STATUS_COLORS.calendar.default;
  }
  return STATUS_COLORS.calendar[status as keyof typeof STATUS_COLORS.calendar] || STATUS_COLORS.calendar.default;
}

/**
 * Helper function to get status label
 */
export function getStatusLabel(status: string | null): string {
  if (!status) {
    return "Sin estado";
  }
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
}

/**
 * Helper function to get simple status label (without emoji)
 */
export function getStatusLabelSimple(status: string | null): string {
  if (!status) {
    return "Sin estado";
  }
  return STATUS_LABELS_SIMPLE[status as keyof typeof STATUS_LABELS_SIMPLE] || status;
}
