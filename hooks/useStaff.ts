/**
 * DEPRECATED: This file is kept for backward compatibility.
 * Please use the new React Query hooks from './useStaff.query.ts' instead.
 *
 * Migration guide:
 * - useStaff() -> useStaff() (same API with React Query)
 * - createStaffMember() -> useCreateStaffMember().mutate()
 * - updateStaffMember() -> useUpdateStaffMember().mutate()
 * - deactivateStaffMember() -> useDeactivateStaffMember().mutate()
 * - reactivateStaffMember() -> useReactivateStaffMember().mutate()
 * - getStaffById() -> useStaffById(staffId)
 * - reorderStaff() -> useReorderStaff().mutate()
 */

import { useAuth } from "@/contexts/auth-context";
import { StaffMemberFormData } from "@/types/appointments";
import { useCallback } from "react";
import {
  useCreateStaffMember as useCreateStaffMemberMutation,
  useDeactivateStaffMember as useDeactivateStaffMemberMutation,
  useReactivateStaffMember as useReactivateStaffMemberMutation,
  useReorderStaff as useReorderStaffMutation,
  useStaff as useStaffQuery,
  useUpdateStaffMember as useUpdateStaffMemberMutation,
  type StaffFilters,
} from "./useStaff.query";

// Re-export StaffFilters for backward compatibility
export type { StaffFilters };

/**
 * Custom hook for managing staff members
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
export function useStaff(filters?: StaffFilters) {
  const { profile } = useAuth();

  // Use React Query hooks
  const { staff, loading, error, refetch } = useStaffQuery(filters);
  const createMutation = useCreateStaffMemberMutation();
  const updateMutation = useUpdateStaffMemberMutation();
  const deactivateMutation = useDeactivateStaffMemberMutation();
  const reactivateMutation = useReactivateStaffMemberMutation();
  const reorderMutation = useReorderStaffMutation();

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

      try {
        await createMutation.mutateAsync(data);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al crear el miembro del personal",
        };
      }
    },
    [profile?.organization_id, createMutation]
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

      try {
        await updateMutation.mutateAsync({ staffId, data });
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al actualizar el miembro del personal",
        };
      }
    },
    [profile?.organization_id, updateMutation]
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

      try {
        await deactivateMutation.mutateAsync(staffId);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al desactivar el miembro del personal",
        };
      }
    },
    [profile?.organization_id, deactivateMutation]
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

      try {
        await reactivateMutation.mutateAsync(staffId);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al reactivar el miembro del personal",
        };
      }
    },
    [profile?.organization_id, reactivateMutation]
  );

  /**
   * Get a single staff member by ID
   * NOTE: This is now handled by useStaffById hook
   * This wrapper is kept for backward compatibility
   */
  const getStaffById = useCallback(
    async (staffId: string) => {
      console.warn(
        "getStaffById is deprecated. Use useStaffById hook instead."
      );

      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      // Import dynamically to avoid circular dependencies
      const { StaffService } = await import("@/services/staff.service");
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

      try {
        await reorderMutation.mutateAsync(staffIds);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al reordenar el personal",
        };
      }
    },
    [profile?.organization_id, reorderMutation]
  );

  /**
   * Refresh staff data
   */
  const refresh = useCallback(() => {
    return refetch();
  }, [refetch]);

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
