/**
 * useNormalizedData Hook
 *
 * Provides normalized state management for appointments, customers, services, and staff.
 * Automatically normalizes data from React Query hooks and provides easy access to
 * both normalized and denormalized data.
 *
 * Benefits:
 * - No data duplication
 * - Consistent updates across all views
 * - O(1) lookups by ID
 * - Automatic synchronization
 */

import {
  useAppointmentsQuery,
  useCustomersQuery,
  useServicesQuery,
  useStaffQuery,
} from "@/hooks";
import {
  Appointment,
  AppointmentWithDetails,
  Customer,
  Service,
  StaffMember,
} from "@/types/appointments";
import {
  NormalizedState,
  denormalizeAppointments,
  getAppointmentWithDetails,
  getAppointmentsArray,
  getCustomerById,
  getCustomersArray,
  getServiceById,
  getServicesArray,
  getStaffArray,
  getStaffById,
  mergeNormalizedState,
  normalizeAppointments,
} from "@/utils/normalized-state";
import { useMemo } from "react";

export interface UseNormalizedDataOptions {
  /**
   * Whether to include appointments in normalization
   * @default true
   */
  includeAppointments?: boolean;
  /**
   * Whether to include customers in normalization
   * @default true
   */
  includeCustomers?: boolean;
  /**
   * Whether to include services in normalization
   * @default true
   */
  includeServices?: boolean;
  /**
   * Whether to include staff in normalization
   * @default true
   */
  includeStaff?: boolean;
  /**
   * Appointment filters for useAppointmentsQuery
   */
  appointmentFilters?: Parameters<typeof useAppointmentsQuery>[0];
  /**
   * Customer filters for useCustomersQuery
   */
  customerFilters?: Parameters<typeof useCustomersQuery>[0];
  /**
   * Service filters for useServicesQuery
   */
  serviceFilters?: Parameters<typeof useServicesQuery>[0];
  /**
   * Staff filters for useStaffQuery
   */
  staffFilters?: Parameters<typeof useStaffQuery>[0];
}

export interface UseNormalizedDataReturn {
  // Normalized state
  normalizedState: NormalizedState;

  // Denormalized arrays (for backward compatibility)
  appointments: AppointmentWithDetails[];
  customers: Customer[];
  services: Service[];
  staff: StaffMember[];

  // Loading states
  loading: boolean;
  appointmentsLoading: boolean;
  customersLoading: boolean;
  servicesLoading: boolean;
  staffLoading: boolean;

  // Error states
  error: string | null;
  appointmentsError: string | null;
  customersError: string | null;
  servicesError: string | null;
  staffError: string | null;

  // Selectors for normalized data
  getAppointment: (id: string) => Appointment | undefined;
  getAppointmentWithDetails: (id: string) => AppointmentWithDetails | null;
  getCustomer: (id: string) => Customer | undefined;
  getService: (id: string) => Service | undefined;
  getStaff: (id: string) => StaffMember | undefined;

  // Helper to get appointments as normalized array
  getAppointments: () => Appointment[];
  getCustomers: () => Customer[];
  getServices: () => Service[];
  getStaffMembers: () => StaffMember[];
}

/**
 * Hook for managing normalized data state
 * Automatically normalizes data from multiple React Query hooks
 */
export function useNormalizedData(
  options: UseNormalizedDataOptions = {}
): UseNormalizedDataReturn {
  const {
    includeAppointments = true,
    includeCustomers = true,
    includeServices = true,
    includeStaff = true,
    appointmentFilters,
    customerFilters,
    serviceFilters,
    staffFilters,
  } = options;

  // Fetch data using React Query hooks
  const appointmentsQuery = useAppointmentsQuery(appointmentFilters || {}, {
    enabled: includeAppointments,
  });

  const customersQuery = useCustomersQuery(customerFilters || {}, {
    enabled: includeCustomers,
  });

  const servicesQuery = useServicesQuery(serviceFilters || {}, {
    enabled: includeServices,
  });

  const staffQuery = useStaffQuery(staffFilters || {}, {
    enabled: includeStaff,
  });

  // Normalize appointments data
  const normalizedFromAppointments = useMemo(() => {
    if (!includeAppointments || !appointmentsQuery.appointments.length) {
      return null;
    }
    return normalizeAppointments(appointmentsQuery.appointments);
  }, [includeAppointments, appointmentsQuery.appointments]);

  // Create normalized state by merging all sources
  const normalizedState = useMemo(() => {
    let state: NormalizedState = {
      appointments: {},
      customers: {},
      services: {},
      staff: {},
    };

    // Merge appointments (which includes customer/service/staff data)
    if (normalizedFromAppointments) {
      state = mergeNormalizedState(state, normalizedFromAppointments);
    }

    // Merge customers (if fetched separately, they may have more complete data)
    if (includeCustomers && customersQuery.customers.length > 0) {
      const customersMap: Record<string, Customer> = {};
      for (const customer of customersQuery.customers) {
        customersMap[customer.id] = customer;
      }
      state = mergeNormalizedState(state, {
        ...state,
        customers: { ...state.customers, ...customersMap },
      });
    }

    // Merge services (if fetched separately, they may have more complete data)
    if (includeServices && servicesQuery.services.length > 0) {
      const servicesMap: Record<string, Service> = {};
      for (const service of servicesQuery.services) {
        servicesMap[service.id] = service;
      }
      state = mergeNormalizedState(state, {
        ...state,
        services: { ...state.services, ...servicesMap },
      });
    }

    // Merge staff (if fetched separately, they may have more complete data)
    if (includeStaff && staffQuery.staff.length > 0) {
      const staffMap: Record<string, StaffMember> = {};
      for (const staffMember of staffQuery.staff) {
        staffMap[staffMember.id] = staffMember;
      }
      state = mergeNormalizedState(state, {
        ...state,
        staff: { ...state.staff, ...staffMap },
      });
    }

    return state;
  }, [
    normalizedFromAppointments,
    includeCustomers,
    customersQuery.customers,
    includeServices,
    servicesQuery.services,
    includeStaff,
    staffQuery.staff,
  ]);

  // Denormalize appointments for backward compatibility
  const denormalizedAppointments = useMemo(() => {
    if (!includeAppointments) {
      return [];
    }
    const appointmentsArray = getAppointmentsArray(normalizedState);
    return denormalizeAppointments(appointmentsArray, normalizedState);
  }, [includeAppointments, normalizedState]);

  // Loading states
  const loading =
    (includeAppointments && appointmentsQuery.loading) ||
    (includeCustomers && customersQuery.loading) ||
    (includeServices && servicesQuery.loading) ||
    (includeStaff && staffQuery.loading);

  // Error states
  const error =
    (includeAppointments && appointmentsQuery.error) ||
    (includeCustomers && customersQuery.error) ||
    (includeServices && servicesQuery.error) ||
    (includeStaff && staffQuery.error) ||
    null;

  // Selectors
  const getAppointment = (id: string) => normalizedState.appointments[id];
  const getAppointmentWithDetailsById = (id: string) =>
    getAppointmentWithDetails(normalizedState, id);
  const getCustomer = (id: string) => getCustomerById(normalizedState, id);
  const getService = (id: string) => getServiceById(normalizedState, id);
  const getStaff = (id: string) => getStaffById(normalizedState, id);

  return {
    normalizedState,
    appointments: denormalizedAppointments,
    customers: includeCustomers
      ? customersQuery.customers
      : getCustomersArray(normalizedState),
    services: includeServices
      ? servicesQuery.services
      : getServicesArray(normalizedState),
    staff: includeStaff ? staffQuery.staff : getStaffArray(normalizedState),
    loading,
    appointmentsLoading: appointmentsQuery.loading,
    customersLoading: customersQuery.loading,
    servicesLoading: servicesQuery.loading,
    staffLoading: staffQuery.loading,
    error,
    appointmentsError: appointmentsQuery.error,
    customersError: customersQuery.error,
    servicesError: servicesQuery.error,
    staffError: staffQuery.error,
    getAppointment,
    getAppointmentWithDetails: getAppointmentWithDetailsById,
    getCustomer,
    getService,
    getStaff,
    getAppointments: () => getAppointmentsArray(normalizedState),
    getCustomers: () => getCustomersArray(normalizedState),
    getServices: () => getServicesArray(normalizedState),
    getStaffMembers: () => getStaffArray(normalizedState),
  };
}
