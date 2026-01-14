/**
 * Hooks Index
 * Centralized exports for all application hooks
 */

// Appointment hooks (React Query powered)
// Export the wrapper version as default for backward compatibility
export { useAppointments, type AppointmentFilters } from "./useAppointments";

// Export individual React Query hooks for new code
export {
  appointmentKeys,
  useAppointmentStatistics,
  useAppointments as useAppointmentsQuery,
  useCheckAvailability,
  useCreateAppointment,
  useDeleteAppointment,
  useInfiniteAppointments,
  useSendReminder,
  useUpdateAppointmentStatus,
} from "./useAppointments.query";

// Customer hooks (React Query powered)
// Export the wrapper version as default for backward compatibility
export { useCustomers, type CustomerFilters } from "./useCustomers";

// Export individual React Query hooks for new code
export {
  customerKeys,
  useCreateCustomer,
  useCustomerById,
  useCustomerStatistics,
  useCustomers as useCustomersQuery,
  useDeactivateCustomer,
  useInfiniteCustomers,
  useReactivateCustomer,
  useUpdateCustomer,
} from "./useCustomers.query";

// Service hooks (React Query powered)
// Export the wrapper version as default for backward compatibility
export { useServices, type ServiceFilters } from "./useServices";

// Export individual React Query hooks for new code
export {
  serviceKeys,
  useCreateService,
  useDeactivateService,
  useReactivateService,
  useReorderServices,
  useServiceById,
  useServices as useServicesQuery,
  useUpdateService,
} from "./useServices.query";

// Staff hooks (React Query powered)
// Export the wrapper version as default for backward compatibility
export { useStaff, type StaffFilters } from "./useStaff";

// Export individual React Query hooks for new code
export {
  staffKeys,
  useCreateStaffMember,
  useDeactivateStaffMember,
  useReactivateStaffMember,
  useReorderStaff,
  useStaffById,
  useStaff as useStaffQuery,
  useUpdateStaffMember,
} from "./useStaff.query";

// Error logs hooks (React Query powered)
export {
  useErrorLogsQuery,
  useErrorStatsQuery,
  useResolveError,
  useUnresolveError,
  type ErrorLog,
  type ErrorLogsQueryParams,
} from "./useErrorLogs.query";

// Normalized data hook
export {
  useNormalizedData,
  type UseNormalizedDataOptions,
  type UseNormalizedDataReturn,
} from "./useNormalizedData";

// Other hooks
export { useAuth } from "./use-auth";
export { useCapacitor } from "./useCapacitor";
export { useLicense } from "./useLicense";
export { toast, useToast } from "./useToast";
