// Types for the TurnoFlash Appointment System
import { Database } from "./database.types";

// Tipos generados desde Supabase - Enums
export type AppointmentStatus =
  Database["public"]["Enums"]["appointment_status"];
export type AppointmentSource =
  Database["public"]["Enums"]["appointment_source"];
export type ReminderMethod = Database["public"]["Enums"]["reminder_method"];
export type ScheduleExceptionType =
  Database["public"]["Enums"]["schedule_exception_type"];
export type TimeOffType = Database["public"]["Enums"]["time_off_type"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];
export type ProficiencyLevel = Database["public"]["Enums"]["proficiency_level"];
export type WaitlistStatus = Database["public"]["Enums"]["waitlist_status"];

// Service Category - Tipos generados desde Supabase
export type ServiceCategory =
  Database["public"]["Tables"]["service_categories"]["Row"];

export interface ServiceCategoryFormData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}

// Service - Tipos generados desde Supabase
export type Service = Database["public"]["Tables"]["services"]["Row"];

export interface ServiceFormData {
  category_id?: string | null;
  name: string;
  description?: string;
  duration_minutes: number;
  buffer_time_minutes?: number;
  price?: number | null;
  currency?: string;
  color?: string;
  is_active?: boolean;
  requires_approval?: boolean;
  max_advance_booking_days?: number;
  min_advance_booking_hours?: number;
  available_for_online_booking?: boolean;
  image_url?: string;
  sort_order?: number;
}

export interface ServiceWithCategory extends Service {
  category?: ServiceCategory | null;
}

// Staff Member - Tipos generados desde Supabase
export type StaffMember = Database["public"]["Tables"]["staff_members"]["Row"];

export interface StaffMemberFormData {
  user_id?: string | null;
  first_name: string;
  last_name: string;
  nickname?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  color?: string;
  bio?: string;
  specialties?: string[];
  is_active?: boolean;
  is_bookable?: boolean;
  accepts_online_bookings?: boolean;
  sort_order?: number;
}

// Staff Service (relation) - Tipos generados desde Supabase
export type StaffService =
  Database["public"]["Tables"]["staff_services"]["Row"];

// Staff Availability - Tipos generados desde Supabase
export type StaffAvailability =
  Database["public"]["Tables"]["staff_availability"]["Row"];

export interface StaffAvailabilityFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available?: boolean;
  effective_from?: string | null;
  effective_until?: string | null;
}

// Staff Exception - Tipos generados desde Supabase
export type StaffException =
  Database["public"]["Tables"]["staff_exceptions"]["Row"];

export interface StaffExceptionFormData {
  staff_id?: string | null;
  exception_type: ScheduleExceptionType;
  start_datetime: string;
  end_datetime: string;
  title: string;
  description?: string;
  is_recurring?: boolean;
}

// Customer - Tipos generados desde Supabase
export type Customer = Database["public"]["Tables"]["customers"]["Row"];

export interface CustomerFormData {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  phone_country_code?: string;
  whatsapp_number?: string;
  date_of_birth?: string;
  gender?: string;
  notes?: string;
  tags?: string[];
  photo_url?: string;
  preferred_staff_id?: string | null;
  is_active?: boolean;
}

export interface CustomerWithPreferredStaff extends Customer {
  preferred_staff?: StaffMember | null;
}

// Appointment - Tipos generados desde Supabase
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

export interface AppointmentFormData {
  customer_id: string;
  service_id: string;
  staff_id?: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status?: AppointmentStatus;
  source?: AppointmentSource;
  notes?: string;
  internal_notes?: string;
  price_charged?: number | null;
  was_paid?: boolean;
  payment_method?: string;
}

export interface AppointmentWithDetails extends Appointment {
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_name: string;
  duration_minutes: number;
  service_price: number | null;
  staff_first_name: string | null;
  staff_last_name: string | null;
  staff_nickname: string | null;
  organization_name: string;
  organization_timezone: string;
}

// Appointment Request - Tipos generados desde Supabase
export type AppointmentRequest =
  Database["public"]["Tables"]["appointment_requests"]["Row"];

export interface AppointmentRequestFormData {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_id: string;
  preferred_staff_id?: string | null;
  preferred_date: string;
  preferred_time: string;
  alternative_dates?: Record<string, unknown>;
  notes?: string;
  source: string;
}

// Business Settings - Tipos generados desde Supabase
export type BusinessSettings =
  Database["public"]["Tables"]["business_settings"]["Row"];

export interface BusinessSettingsFormData {
  business_hours_config?: Record<string, unknown>;
  slot_duration_minutes?: number;
  allow_online_booking?: boolean;
  require_approval?: boolean;
  max_advance_booking_days?: number;
  min_advance_booking_hours?: number;
  allow_same_day_booking?: boolean;
  cancellation_policy_hours?: number;
  enable_waitlist?: boolean;
  enable_reminders?: boolean;
  reminder_settings?: Record<string, unknown>;
  booking_page_url?: string;
  booking_page_enabled?: boolean;
  whatsapp_integration_enabled?: boolean;
  whatsapp_bot_number?: string;
  default_appointment_color?: string;
}

// Waitlist - Tipos generados desde Supabase
export type Waitlist = Database["public"]["Tables"]["waitlist"]["Row"];

// Customer History - Tipos generados desde Supabase
export type CustomerHistory =
  Database["public"]["Tables"]["customer_history"]["Row"];

// Notification - Tipos generados desde Supabase
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

// Reminder Log - Tipos generados desde Supabase
export type ReminderLog = Database["public"]["Tables"]["reminder_logs"]["Row"];

// Utility types for forms and components
export interface TimeSlot {
  time: string;
  available: boolean;
  staff_id?: string;
}

export interface DaySchedule {
  date: string;
  slots: TimeSlot[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: string;
  appointment?: Appointment;
  color?: string;
}

// Statistics and reports
export interface AppointmentStats {
  total_appointments: number;
  completed: number;
  cancelled: number;
  no_shows: number;
  pending: number;
  total_revenue: number;
  average_rating: number;
}

export interface DailySummary {
  date: string;
  total_appointments: number;
  completed: number;
  no_shows: number;
  cancelled: number;
  revenue: number;
}

// Filters for lists
export interface AppointmentFilters {
  status?: AppointmentStatus[];
  staff_id?: string;
  service_id?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  source?: AppointmentSource[];
}

export interface CustomerFilters {
  search?: string;
  tags?: string[];
  is_active?: boolean;
  preferred_staff_id?: string;
  has_upcoming_appointments?: boolean;
}

export interface ServiceFilters {
  category_id?: string;
  is_active?: boolean;
  available_for_online_booking?: boolean;
  min_duration?: number;
  max_duration?: number;
}
