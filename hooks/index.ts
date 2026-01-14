/**
 * Custom Hooks for TurnoFlash
 * Centralized export point for all custom hooks
 */

// Authentication hooks
export { useAuth } from "@/contexts/auth-context";

// Resource management hooks
export { useAppointments } from "./useAppointments";
export { useCustomers } from "./useCustomers";
export { useServices } from "./useServices";
export { useStaff } from "./useStaff";

// Utility hooks
export { useCapacitor } from "./useCapacitor";
export { useLicense } from "./useLicense";

// Type exports
export type { AppointmentFilters } from "./useAppointments";
export type { CustomerFilters } from "./useCustomers";
export type { ServiceFilters } from "./useServices";
export type { StaffFilters } from "./useStaff";
