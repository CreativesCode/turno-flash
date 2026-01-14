/**
 * DEPRECATED: This file is kept for backward compatibility.
 * Please use the new React Query hooks from './useCustomers.query.ts' instead.
 *
 * Migration guide:
 * - useCustomers() -> useCustomers() (same API with React Query)
 * - createCustomer() -> useCreateCustomer().mutate()
 * - updateCustomer() -> useUpdateCustomer().mutate()
 * - deactivateCustomer() -> useDeactivateCustomer().mutate()
 * - reactivateCustomer() -> useReactivateCustomer().mutate()
 * - getCustomerById() -> useCustomerById(customerId)
 * - getCustomerStatistics() -> useCustomerStatistics(customerId)
 */

import { useAuth } from "@/contexts/auth-context";
import { CustomerFormData } from "@/types/appointments";
import { useCallback } from "react";
import {
  useCreateCustomer as useCreateCustomerMutation,
  useCustomers as useCustomersQuery,
  useDeactivateCustomer as useDeactivateCustomerMutation,
  useReactivateCustomer as useReactivateCustomerMutation,
  useUpdateCustomer as useUpdateCustomerMutation,
  type CustomerFilters,
} from "./useCustomers.query";

// Re-export CustomerFilters for backward compatibility
export type { CustomerFilters };

/**
 * Custom hook for managing customers
 * NOW POWERED BY REACT QUERY! 🚀
 *
 * This hook now uses React Query under the hood for:
 * - Automatic caching
 * - Smart refetching
 * - Optimistic updates
 * - Better performance
 *
 * The API remains the same for backward compatibility.
 */
export function useCustomers(filters?: CustomerFilters) {
  const { profile } = useAuth();

  // Use React Query hooks
  const { customers, loading, error, refetch } = useCustomersQuery(filters);
  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();
  const deactivateMutation = useDeactivateCustomerMutation();
  const reactivateMutation = useReactivateCustomerMutation();

  /**
   * Create a new customer
   */
  const createCustomer = useCallback(
    async (data: CustomerFormData) => {
      if (!profile?.organization_id || !profile?.user_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        const customer = await createMutation.mutateAsync(data);
        return { success: true, customer };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : "Error al crear el cliente",
        };
      }
    },
    [profile?.organization_id, profile?.user_id, createMutation]
  );

  /**
   * Update an existing customer
   */
  const updateCustomer = useCallback(
    async (customerId: string, data: Partial<CustomerFormData>) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        await updateMutation.mutateAsync({ customerId, data });
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al actualizar el cliente",
        };
      }
    },
    [profile?.organization_id, updateMutation]
  );

  /**
   * Deactivate a customer (soft delete)
   */
  const deactivateCustomer = useCallback(
    async (customerId: string) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        await deactivateMutation.mutateAsync(customerId);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al desactivar el cliente",
        };
      }
    },
    [profile?.organization_id, deactivateMutation]
  );

  /**
   * Reactivate a customer
   */
  const reactivateCustomer = useCallback(
    async (customerId: string) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        await reactivateMutation.mutateAsync(customerId);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al reactivar el cliente",
        };
      }
    },
    [profile?.organization_id, reactivateMutation]
  );

  /**
   * Get a single customer by ID
   * NOTE: This is now handled by useCustomerById hook
   * This wrapper is kept for backward compatibility
   */
  const getCustomerById = useCallback(
    async (customerId: string) => {
      console.warn(
        "getCustomerById is deprecated. Use useCustomerById hook instead."
      );

      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      // Import dynamically to avoid circular dependencies
      const { CustomerService } = await import("@/services/customers.service");
      return await CustomerService.getById(customerId, profile.organization_id);
    },
    [profile?.organization_id]
  );

  /**
   * Get customer statistics
   * NOTE: This is now handled by useCustomerStatistics hook
   * This wrapper is kept for backward compatibility
   */
  const getCustomerStatistics = useCallback(
    async (customerId: string) => {
      console.warn(
        "getCustomerStatistics is deprecated. Use useCustomerStatistics hook instead."
      );

      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      // Import dynamically to avoid circular dependencies
      const { CustomerService } = await import("@/services/customers.service");
      return await CustomerService.getStatistics(
        customerId,
        profile.organization_id
      );
    },
    [profile?.organization_id]
  );

  /**
   * Refresh customers data
   */
  const refresh = useCallback(() => {
    return refetch();
  }, [refetch]);

  return {
    customers,
    loading,
    error,
    createCustomer,
    updateCustomer,
    deactivateCustomer,
    reactivateCustomer,
    getCustomerById,
    getCustomerStatistics,
    refresh,
  };
}
