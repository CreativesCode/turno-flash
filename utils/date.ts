/**
 * Date utilities for handling dates in local timezone
 * Prevents timezone conversion issues with Date.toISOString()
 */

/**
 * Get current date in YYYY-MM-DD format in local timezone
 * This prevents the date from shifting when using toISOString()
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in HH:MM format in local timezone
 */
export function getLocalTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Convert a date string (YYYY-MM-DD) to a Date object at midnight local time
 * This prevents timezone issues when creating Date objects from date strings
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date for display in Spanish locale
 */
export function formatDateForDisplay(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === "string" ? parseLocalDate(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };

  return dateObj.toLocaleDateString("es-ES", options || defaultOptions);
}

/**
 * Format a date for short display in Spanish locale
 */
export function formatDateShort(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === "string" ? parseLocalDate(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  };

  return dateObj.toLocaleDateString("es-ES", options || defaultOptions);
}

/**
 * Get ISO string for timestamp columns (with timezone)
 * Use this only for TIMESTAMPTZ columns like created_at, updated_at
 */
export function getTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Check if a date string is today
 */
export function isToday(dateString: string): boolean {
  return dateString === getLocalDateString();
}

/**
 * Add days to a date and return as YYYY-MM-DD string
 */
export function addDays(dateString: string, days: number): string {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

/**
 * Get start of week (Monday) for a given date
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Generate an array of dates for a week starting from the given date
 */
export function getWeekDays(date: Date): Date[] {
  const startOfWeek = getStartOfWeek(date);
  const days: Date[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }

  return days;
}

/**
 * Compare two date strings
 * Returns: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(date1: string, date2: string): number {
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
}
