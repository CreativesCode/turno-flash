import { useAuth } from "@/contexts/auth-context";
import { ServiceService } from "@/services/services.service";
import { Service, ServiceFormData } from "@/types/appointments";
import { useCallback, useEffect, useState } from "react";

/**
 * Filters for services query
 */
export interface ServiceFilters {
  isActive?: boolean;
  categoryId?: string;
  availableForOnlineBooking?: boolean;
}

/**
 * Custom hook for managing services
 * Provides CRUD operations and state management for services
 */
export function useServices(filters?: ServiceFilters) {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load services from the service layer
   */
  const loadServices = useCallback(async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await ServiceService.getAll(profile.organization_id, {
        isActive: filters?.isActive,
        categoryId: filters?.categoryId,
        availableForOnlineBooking: filters?.availableForOnlineBooking,
      });

      if (result.success && result.services) {
        setServices(result.services);
      } else {
        setError(result.error || "Error al cargar los servicios");
      }
    } catch (err) {
      console.error("Error loading services:", err);
      setError("Error inesperado al cargar los servicios");
    } finally {
      setLoading(false);
    }
  }, [
    profile?.organization_id,
    filters?.isActive,
    filters?.categoryId,
    filters?.availableForOnlineBooking,
  ]);

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

      const result = await ServiceService.create(data, profile.organization_id);

      if (result.success) {
        // Reload services to get the updated list
        await loadServices();
      }

      return result;
    },
    [profile?.organization_id, loadServices]
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

      const result = await ServiceService.update(
        serviceId,
        data,
        profile.organization_id
      );

      if (result.success) {
        // Reload services to get the updated list
        await loadServices();
      }

      return result;
    },
    [profile?.organization_id, loadServices]
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

      const result = await ServiceService.deactivate(
        serviceId,
        profile.organization_id
      );

      if (result.success) {
        // Reload services to get the updated list
        await loadServices();
      }

      return result;
    },
    [profile?.organization_id, loadServices]
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

      const result = await ServiceService.reactivate(
        serviceId,
        profile.organization_id
      );

      if (result.success) {
        // Reload services to get the updated list
        await loadServices();
      }

      return result;
    },
    [profile?.organization_id, loadServices]
  );

  /**
   * Get a single service by ID
   */
  const getServiceById = useCallback(
    async (serviceId: string) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

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

      const result = await ServiceService.reorder(
        serviceIds,
        profile.organization_id
      );

      if (result.success) {
        // Reload services to get the updated order
        await loadServices();
      }

      return result;
    },
    [profile?.organization_id, loadServices]
  );

  /**
   * Refresh services data
   */
  const refresh = useCallback(() => {
    return loadServices();
  }, [loadServices]);

  // Auto-load on mount and when filters change
  useEffect(() => {
    loadServices();
  }, [loadServices]);

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
