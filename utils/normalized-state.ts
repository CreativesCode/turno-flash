/**
 * Normalized State Management
 *
 * Implements data normalization pattern to avoid duplication and ensure consistency.
 * Instead of storing nested/duplicated data, we store entities separately and reference them by ID.
 *
 * Example:
 * // Before (denormalized - bad)
 * const appointments = [
 *   { id: '1', customer: { id: 'c1', name: 'Juan' }, service: {...} },
 *   { id: '2', customer: { id: 'c1', name: 'Juan' }, service: {...} }, // Duplicated customer data
 * ];
 *
 * // After (normalized - good)
 * const state = {
 *   appointments: { '1': { customerId: 'c1', serviceId: 's1' } },
 *   customers: { 'c1': { name: 'Juan' } },
 *   services: { 's1': { name: 'Corte' } },
 * };
 */

import {
  Appointment,
  AppointmentWithDetails,
  Customer,
  Service,
  StaffMember,
} from "@/types/appointments";

/**
 * Normalized state structure
 * Entities are stored in maps keyed by their IDs for O(1) lookup
 */
export interface NormalizedState {
  appointments: Record<string, Appointment>;
  customers: Record<string, Customer>;
  services: Record<string, Service>;
  staff: Record<string, StaffMember>;
}

/**
 * Create an empty normalized state
 */
export function createEmptyNormalizedState(): NormalizedState {
  return {
    appointments: {},
    customers: {},
    services: {},
    staff: {},
  };
}

/**
 * Normalize AppointmentWithDetails array into normalized state
 * Extracts and deduplicates all entities
 */
export function normalizeAppointments(
  appointmentsWithDetails: AppointmentWithDetails[]
): NormalizedState {
  const state = createEmptyNormalizedState();

  for (const aptWithDetails of appointmentsWithDetails) {
    // Extract and store appointment (without nested data)
    const appointment: Appointment = {
      id: aptWithDetails.id,
      organization_id: aptWithDetails.organization_id,
      appointment_number: aptWithDetails.appointment_number,
      customer_id: aptWithDetails.customer_id,
      service_id: aptWithDetails.service_id,
      staff_id: aptWithDetails.staff_id,
      appointment_date: aptWithDetails.appointment_date,
      start_time: aptWithDetails.start_time,
      end_time: aptWithDetails.end_time,
      timezone: aptWithDetails.timezone,
      actual_start_time: aptWithDetails.actual_start_time,
      actual_end_time: aptWithDetails.actual_end_time,
      status: aptWithDetails.status,
      source: aptWithDetails.source,
      confirmation_sent_at: aptWithDetails.confirmation_sent_at,
      reminder_sent_at: aptWithDetails.reminder_sent_at,
      client_confirmed_at: aptWithDetails.client_confirmed_at,
      reminder_method: aptWithDetails.reminder_method,
      notes: aptWithDetails.notes,
      internal_notes: aptWithDetails.internal_notes,
      cancellation_reason: aptWithDetails.cancellation_reason,
      cancelled_by: aptWithDetails.cancelled_by,
      cancelled_at: aptWithDetails.cancelled_at,
      price_charged: aptWithDetails.price_charged,
      was_paid: aptWithDetails.was_paid,
      payment_method: aptWithDetails.payment_method,
      rating: aptWithDetails.rating,
      feedback: aptWithDetails.feedback,
      created_by: aptWithDetails.created_by,
      created_at: aptWithDetails.created_at,
      updated_at: aptWithDetails.updated_at,
    };
    state.appointments[appointment.id] = appointment;

    // Extract and store customer (only if not already stored)
    if (!state.customers[aptWithDetails.customer_id]) {
      // We need to reconstruct the customer from the flattened data
      // Note: This is a limitation - we don't have all customer fields in AppointmentWithDetails
      // In a real scenario, you'd fetch customers separately or ensure the view includes all fields
      const customer: Partial<Customer> = {
        id: aptWithDetails.customer_id,
        organization_id: aptWithDetails.organization_id,
        first_name: aptWithDetails.customer_first_name,
        last_name: aptWithDetails.customer_last_name,
        phone: aptWithDetails.customer_phone,
        email: aptWithDetails.customer_email,
        // Note: Other fields are not available in AppointmentWithDetails
        // They should be fetched separately or included in the view
      };
      state.customers[aptWithDetails.customer_id] = customer as Customer;
    }

    // Extract and store service (only if not already stored)
    if (!state.services[aptWithDetails.service_id]) {
      const service: Partial<Service> = {
        id: aptWithDetails.service_id,
        organization_id: aptWithDetails.organization_id,
        name: aptWithDetails.service_name,
        duration_minutes: aptWithDetails.duration_minutes,
        price: aptWithDetails.service_price,
        // Note: Other fields are not available in AppointmentWithDetails
        // They should be fetched separately or included in the view
      };
      state.services[aptWithDetails.service_id] = service as Service;
    }

    // Extract and store staff (only if not already stored and exists)
    if (
      aptWithDetails.staff_id &&
      !state.staff[aptWithDetails.staff_id] &&
      aptWithDetails.staff_first_name
    ) {
      const staff: Partial<StaffMember> = {
        id: aptWithDetails.staff_id,
        organization_id: aptWithDetails.organization_id,
        first_name: aptWithDetails.staff_first_name,
        last_name: aptWithDetails.staff_last_name || "",
        nickname: aptWithDetails.staff_nickname,
        // Note: Other fields are not available in AppointmentWithDetails
        // They should be fetched separately or included in the view
      };
      state.staff[aptWithDetails.staff_id] = staff as StaffMember;
    }
  }

  return state;
}

/**
 * Merge new normalized state into existing state
 * Updates existing entities and adds new ones
 */
export function mergeNormalizedState(
  existing: NormalizedState,
  incoming: NormalizedState
): NormalizedState {
  return {
    appointments: { ...existing.appointments, ...incoming.appointments },
    customers: { ...existing.customers, ...incoming.customers },
    services: { ...existing.services, ...incoming.services },
    staff: { ...existing.staff, ...incoming.staff },
  };
}

/**
 * Denormalize an appointment back to AppointmentWithDetails format
 * Useful for backward compatibility with existing code
 */
export function denormalizeAppointment(
  appointment: Appointment,
  state: NormalizedState
): AppointmentWithDetails | null {
  const customer = state.customers[appointment.customer_id];
  const service = state.services[appointment.service_id];
  const staff = appointment.staff_id ? state.staff[appointment.staff_id] : null;

  if (!customer || !service) {
    return null; // Missing required data
  }

  return {
    ...appointment,
    customer_first_name: customer.first_name,
    customer_last_name: customer.last_name,
    customer_phone: customer.phone,
    customer_email: customer.email || null,
    service_name: service.name,
    duration_minutes: service.duration_minutes,
    service_price: service.price,
    staff_first_name: staff?.first_name || null,
    staff_last_name: staff?.last_name || null,
    staff_nickname: staff?.nickname || null,
    organization_name: "", // Not available in normalized state
    organization_timezone: appointment.timezone || "UTC",
  };
}

/**
 * Denormalize multiple appointments
 */
export function denormalizeAppointments(
  appointments: Appointment[],
  state: NormalizedState
): AppointmentWithDetails[] {
  return appointments
    .map((apt) => denormalizeAppointment(apt, state))
    .filter((apt): apt is AppointmentWithDetails => apt !== null);
}

/**
 * Get all appointments as an array
 */
export function getAppointmentsArray(state: NormalizedState): Appointment[] {
  return Object.values(state.appointments);
}

/**
 * Get all customers as an array
 */
export function getCustomersArray(state: NormalizedState): Customer[] {
  return Object.values(state.customers);
}

/**
 * Get all services as an array
 */
export function getServicesArray(state: NormalizedState): Service[] {
  return Object.values(state.services);
}

/**
 * Get all staff as an array
 */
export function getStaffArray(state: NormalizedState): StaffMember[] {
  return Object.values(state.staff);
}

/**
 * Get a customer by ID
 */
export function getCustomerById(
  state: NormalizedState,
  customerId: string
): Customer | undefined {
  return state.customers[customerId];
}

/**
 * Get a service by ID
 */
export function getServiceById(
  state: NormalizedState,
  serviceId: string
): Service | undefined {
  return state.services[serviceId];
}

/**
 * Get staff by ID
 */
export function getStaffById(
  state: NormalizedState,
  staffId: string
): StaffMember | undefined {
  return state.staff[staffId];
}

/**
 * Get an appointment by ID with all related data
 */
export function getAppointmentWithDetails(
  state: NormalizedState,
  appointmentId: string
): AppointmentWithDetails | null {
  const appointment = state.appointments[appointmentId];
  if (!appointment) {
    return null;
  }
  return denormalizeAppointment(appointment, state);
}
