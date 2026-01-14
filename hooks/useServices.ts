/**
 * DEPRECATED: This file is kept for backward compatibility.
 * Please use the new React Query hooks from './useServices.query.ts' instead.
 *
 * Migration guide:
 * - useServices() -> useServices() (same API with React Query)
 * - createService() -> useCreateService().mutate()
 * - updateService() -> useUpdateService().mutate()
 * - deactivateService() -> useDeactivateService().mutate()
 * - reactivateService() -> useReactivateService().mutate()
 * - getServiceById() -> useServiceById(serviceId)
 * - reorderServices() -> useReorderServices().mutate()
 */

import { useAuth } from "@/contexts/auth-context";
import { ServiceFormData } from "@/types/appointments";
import { useCallback } from "react";
import {
  useCreateService as useCreateServiceMutation,
  useDeactivateService as useDeactivateServiceMutation,
  useReactivateService as useReactivateServiceMutation,
  useReorderServices as useReorderServicesMutation,
  useServices as useServicesQuery,
  useUpdateService as useUpdateServiceMutation,
  type ServiceFilters,
} from "./useServices.query";

// Re-export ServiceFilters for backward compatibility
export type { ServiceFilters };

/**
 * Custom hook for managing services
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
export function useServices(filters?: ServiceFilters) {
  const { profile } = useAuth();

  // Use React Query hooks
  const { services, loading, error, refetch } = useServicesQuery(filters);
  const createMutation = useCreateServiceMutation();
  const updateMutation = useUpdateServiceMutation();
  const deactivateMutation = useDeactivateServiceMutation();
  const reactivateMutation = useReactivateServiceMutation();
  const reorderMutation = useReorderServicesMutation();

  /**
   * Create a new service
   */
  const createService = useCallback(
    async (data: ServiceFormData) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        await createMutation.mutateAsync(data);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : "Error al crear el servicio",
        };
      }
    },
    [profile?.organization_id, createMutation]
  );

  /**
   * Update an existing service
   */
  const updateService = useCallback(
    async (serviceId: string, data: Partial<ServiceFormData>) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        await updateMutation.mutateAsync({ serviceId, data });
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al actualizar el servicio",
        };
      }
    },
    [profile?.organization_id, updateMutation]
  );

  /**
   * Deactivate a service (soft delete)
   */
  const deactivateService = useCallback(
    async (serviceId: string) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        await deactivateMutation.mutateAsync(serviceId);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al desactivar el servicio",
        };
      }
    },
    [profile?.organization_id, deactivateMutation]
  );

  /**
   * Reactivate a service
   */
  const reactivateService = useCallback(
    async (serviceId: string) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        await reactivateMutation.mutateAsync(serviceId);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al reactivar el servicio",
        };
      }
    },
    [profile?.organization_id, reactivateMutation]
  );

  /**
   * Get a single service by ID
   * NOTE: This is now handled by useServiceById hook
   * This wrapper is kept for backward compatibility
   */
  const getServiceById = useCallback(
    async (serviceId: string) => {
      console.warn(
        "getServiceById is deprecated. Use useServiceById hook instead."
      );

      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      // Import dynamically to avoid circular dependencies
      const { ServiceService } = await import("@/services/services.service");
      return await ServiceService.getById(serviceId, profile.organization_id);
    },
    [profile?.organization_id]
  );

  /**
   * Reorder services
   */
  const reorderServices = useCallback(
    async (serviceIds: string[]) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        await reorderMutation.mutateAsync(serviceIds);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al reordenar los servicios",
        };
      }
    },
    [profile?.organization_id, reorderMutation]
  );

  /**
   * Refresh services data
   */
  const refresh = useCallback(() => {
    return refetch();
  }, [refetch]);

  return {
    services,
    loading,
    error,
    createService,
    updateService,
    deactivateService,
    reactivateService,
    getServiceById,
    reorderServices,
    refresh,
  };
}
