// Types for the TurnoFlash Appointment System

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "reminded"
  | "client_confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

export type AppointmentSource =
  | "web"
  | "whatsapp"
  | "phone"
  | "walk_in"
  | "admin";

export type ReminderMethod = "whatsapp" | "sms" | "email" | "call" | "push";

export type ScheduleExceptionType =
  | "time_off"
  | "holiday"
  | "special_hours"
  | "blocked";

export type TimeOffType =
  | "vacation"
  | "sick_leave"
  | "personal"
  | "unpaid"
  | "other";

export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired";

export type ProficiencyLevel = "junior" | "intermediate" | "senior" | "expert";

export type WaitlistStatus =
  | "active"
  | "notified"
  | "booked"
  | "expired"
  | "cancelled";

// Service Category
export interface ServiceCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategoryFormData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}

// Service
export interface Service {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_time_minutes: number;
  price: number | null;
  currency: string;
  color: string;
  is_active: boolean;
  requires_approval: boolean;
  max_advance_booking_days: number;
  min_advance_booking_hours: number;
  available_for_online_booking: boolean;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

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

// Staff Member
export interface StaffMember {
  id: string;
  organization_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  color: string;
  bio: string | null;
  specialties: string[] | null;
  is_active: boolean;
  is_bookable: boolean;
  accepts_online_bookings: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

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

// Staff Service (relation)
export interface StaffService {
  id: string;
  staff_id: string;
  service_id: string;
  proficiency_level: ProficiencyLevel;
  created_at: string;
}

// Staff Availability
export interface StaffAvailability {
  id: string;
  staff_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
  effective_from: string | null;
  effective_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffAvailabilityFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available?: boolean;
  effective_from?: string | null;
  effective_until?: string | null;
}

// Staff Exception
export interface StaffException {
  id: string;
  staff_id: string | null;
  organization_id: string;
  exception_type: ScheduleExceptionType;
  start_datetime: string;
  end_datetime: string;
  title: string;
  description: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffExceptionFormData {
  staff_id?: string | null;
  exception_type: ScheduleExceptionType;
  start_datetime: string;
  end_datetime: string;
  title: string;
  description?: string;
  is_recurring?: boolean;
}

// Customer
export interface Customer {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  phone_country_code: string;
  whatsapp_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
  tags: string[] | null;
  photo_url: string | null;
  preferred_staff_id: string | null;
  is_active: boolean;
  total_appointments: number;
  missed_appointments: number;
  last_appointment_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

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

// Appointment
export interface Appointment {
  id: string;
  organization_id: string;
  appointment_number: string | null;
  customer_id: string;
  service_id: string;
  staff_id: string | null;
  appointment_date: string; // DATE
  start_time: string; // TIME
  end_time: string; // TIME
  timezone: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  status: AppointmentStatus;
  source: AppointmentSource;
  confirmation_sent_at: string | null;
  reminder_sent_at: string | null;
  client_confirmed_at: string | null;
  reminder_method: ReminderMethod | null;
  notes: string | null;
  internal_notes: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  price_charged: number | null;
  was_paid: boolean;
  payment_method: string | null;
  rating: number | null;
  feedback: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

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

// Appointment Request
export interface AppointmentRequest {
  id: string;
  organization_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_id: string;
  preferred_staff_id: string | null;
  preferred_date: string;
  preferred_time: string;
  alternative_dates: Record<string, unknown> | null;
  notes: string | null;
  status: RequestStatus;
  source: string;
  approved_by: string | null;
  approved_at: string | null;
  appointment_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  expires_at: string | null;
}

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

// Business Settings
export interface BusinessSettings {
  id: string;
  organization_id: string;
  business_hours_config: Record<string, unknown> | null;
  slot_duration_minutes: number;
  allow_online_booking: boolean;
  require_approval: boolean;
  max_advance_booking_days: number;
  min_advance_booking_hours: number;
  allow_same_day_booking: boolean;
  cancellation_policy_hours: number;
  enable_waitlist: boolean;
  enable_reminders: boolean;
  reminder_settings: Record<string, unknown> | null;
  booking_page_url: string | null;
  booking_page_enabled: boolean;
  whatsapp_integration_enabled: boolean;
  whatsapp_bot_number: string | null;
  default_appointment_color: string;
  created_at: string;
  updated_at: string;
}

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

// Waitlist
export interface Waitlist {
  id: string;
  organization_id: string;
  customer_id: string;
  service_id: string;
  preferred_staff_id: string | null;
  preferred_date: string;
  preferred_time: string | null;
  flexible_dates: boolean;
  flexible_times: boolean;
  notes: string | null;
  status: WaitlistStatus;
  priority: number;
  notified_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Customer History
export interface CustomerHistory {
  id: string;
  customer_id: string;
  appointment_id: string | null;
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

// Notification
export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  type: string;
  title: string;
  message: string;
  appointment_id: string | null;
  customer_id: string | null;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
}

// Reminder Log
export interface ReminderLog {
  id: string;
  appointment_id: string;
  reminder_type: string;
  method: ReminderMethod;
  message_content: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  status: string;
  error_message: string | null;
}

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
