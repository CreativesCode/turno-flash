import { useAuth } from "@/contexts/auth-context";
import { StaffService } from "@/services/staff.service";
import { StaffMember, StaffMemberFormData } from "@/types/appointments";
import { useCallback, useEffect, useState } from "react";

/**
 * Filters for staff query
 */
export interface StaffFilters {
  isActive?: boolean;
  isBookable?: boolean;
  acceptsOnlineBookings?: boolean;
}

/**
 * Custom hook for managing staff members
 * Provides CRUD operations and state management for staff
 */
export function useStaff(filters?: StaffFilters) {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load staff members from the service layer
   */
  const loadStaff = useCallback(async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await StaffService.getAll(profile.organization_id, {
        isActive: filters?.isActive,
        isBookable: filters?.isBookable,
        acceptsOnlineBookings: filters?.acceptsOnlineBookings,
      });

      if (result.success && result.staff) {
        setStaff(result.staff);
      } else {
        setError(result.error || "Error al cargar el personal");
      }
    } catch (err) {
      console.error("Error loading staff:", err);
      setError("Error inesperado al cargar el personal");
    } finally {
      setLoading(false);
    }
  }, [
    profile?.organization_id,
    filters?.isActive,
    filters?.isBookable,
    filters?.acceptsOnlineBookings,
  ]);

  /**
   * Create a new staff member
   */
  const createStaffMember = useCallback(
    async (data: StaffMemberFormData) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      const result = await StaffService.create(data, profile.organization_id);

      if (result.success) {
        // Reload staff to get the updated list
        await loadStaff();
      }

      return result;
    },
    [profile?.organization_id, loadStaff]
  );

  /**
   * Update an existing staff member
   */
  const updateStaffMember = useCallback(
    async (staffId: string, data: Partial<StaffMemberFormData>) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      const result = await StaffService.update(
        staffId,
        data,
        profile.organization_id
      );

      if (result.success) {
        // Reload staff to get the updated list
        await loadStaff();
      }

      return result;
    },
    [profile?.organization_id, loadStaff]
  );

  /**
   * Deactivate a staff member (soft delete)
   */
  const deactivateStaffMember = useCallback(
    async (staffId: string) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      const result = await StaffService.deactivate(
        staffId,
        profile.organization_id
      );

      if (result.success) {
        // Reload staff to get the updated list
        await loadStaff();
      }

      return result;
    },
    [profile?.organization_id, loadStaff]
  );

  /**
   * Reactivate a staff member
   */
  const reactivateStaffMember = useCallback(
    async (staffId: string) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      const result = await StaffService.reactivate(
        staffId,
        profile.organization_id
      );

      if (result.success) {
        // Reload staff to get the updated list
        await loadStaff();
      }

      return result;
    },
    [profile?.organization_id, loadStaff]
  );

  /**
   * Get a single staff member by ID
   */
  const getStaffById = useCallback(
    async (staffId: string) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      return await StaffService.getById(staffId, profile.organization_id);
    },
    [profile?.organization_id]
  );

  /**
   * Reorder staff members
   */
  const reorderStaff = useCallback(
    async (staffIds: string[]) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      const result = await StaffService.reorder(
        staffIds,
        profile.organization_id
      );

      if (result.success) {
        // Reload staff to get the updated order
        await loadStaff();
      }

      return result;
    },
    [profile?.organization_id, loadStaff]
  );

  /**
   * Refresh staff data
   */
  const refresh = useCallback(() => {
    return loadStaff();
  }, [loadStaff]);

  // Auto-load on mount and when filters change
  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  return {
    staff,
    loading,
    error,
    createStaffMember,
    updateStaffMember,
    deactivateStaffMember,
    reactivateStaffMember,
    getStaffById,
    reorderStaff,
    refresh,
  };
}
