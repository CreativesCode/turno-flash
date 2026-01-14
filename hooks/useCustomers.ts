import { useAuth } from "@/contexts/auth-context";
import { CustomerService } from "@/services/customers.service";
import { Customer, CustomerFormData } from "@/types/appointments";
import { useCallback, useEffect, useState } from "react";

/**
 * Filters for customers query
 */
export interface CustomerFilters {
  isActive?: boolean;
  search?: string;
}

/**
 * Custom hook for managing customers
 * Provides CRUD operations and state management for customers
 */
export function useCustomers(filters?: CustomerFilters) {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load customers from the service
   */
  const loadCustomers = useCallback(async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await CustomerService.getAll(profile.organization_id, {
        isActive: filters?.isActive,
        search: filters?.search,
      });

      if (result.success && result.customers) {
        setCustomers(result.customers);
      } else {
        setError(result.error || "Error al cargar los clientes");
      }
    } catch (err) {
      console.error("Error loading customers:", err);
      setError("Error inesperado al cargar los clientes");
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, filters?.isActive, filters?.search]);

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

      const result = await CustomerService.create(
        data,
        profile.organization_id,
        profile.user_id
      );

      if (result.success) {
        // Reload customers to get the updated list
        await loadCustomers();
      }

      return result;
    },
    [profile?.organization_id, profile?.user_id, loadCustomers]
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

      const result = await CustomerService.update(
        customerId,
        data,
        profile.organization_id
      );

      if (result.success) {
        // Reload customers to get the updated list
        await loadCustomers();
      }

      return result;
    },
    [profile?.organization_id, loadCustomers]
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

      const result = await CustomerService.deactivate(
        customerId,
        profile.organization_id
      );

      if (result.success) {
        // Reload customers to get the updated list
        await loadCustomers();
      }

      return result;
    },
    [profile?.organization_id, loadCustomers]
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

      const result = await CustomerService.reactivate(
        customerId,
        profile.organization_id
      );

      if (result.success) {
        // Reload customers to get the updated list
        await loadCustomers();
      }

      return result;
    },
    [profile?.organization_id, loadCustomers]
  );

  /**
   * Get a single customer by ID
   */
  const getCustomerById = useCallback(
    async (customerId: string) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      return await CustomerService.getById(customerId, profile.organization_id);
    },
    [profile?.organization_id]
  );

  /**
   * Get customer statistics
   */
  const getCustomerStatistics = useCallback(
    async (customerId: string) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

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
    return loadCustomers();
  }, [loadCustomers]);

  // Auto-load on mount and when filters change
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

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
