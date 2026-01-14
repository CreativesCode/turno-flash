import { StaffMember, StaffMemberFormData } from "@/types/appointments";
import { createClient } from "@/utils/supabase/client";

/**
 * Service Layer for Staff Management
 * Handles all business logic related to staff members
 */
export class StaffService {
  /**
   * Validate staff form data
   */
  private static validateStaffData(data: StaffMemberFormData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.first_name || data.first_name.trim() === "") {
      errors.push("El nombre es requerido");
    }

    if (!data.last_name || data.last_name.trim() === "") {
      errors.push("El apellido es requerido");
    }

    // Validate email format if provided
    if (data.email && data.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push("El formato del email es inválido");
      }
    }

    // Validate phone format if provided
    if (data.phone && data.phone.length < 8) {
      errors.push("El teléfono debe tener al menos 8 dígitos");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a new staff member
   */
  static async create(
    data: StaffMemberFormData,
    organizationId: string
  ): Promise<{
    success: boolean;
    error?: string;
    staff?: StaffMember;
  }> {
    try {
      // Validate input data
      const validation = this.validateStaffData(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(", "),
        };
      }

      const supabase = createClient();

      // Check if email already exists (if provided)
      if (data.email) {
        const { data: existingStaff } = await supabase
          .from("staff_members")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("email", data.email)
          .single();

        if (existingStaff) {
          return {
            success: false,
            error: "Ya existe un miembro del staff con ese email",
          };
        }
      }

      // Get the max sort_order to append at the end
      const { data: maxSortOrder } = await supabase
        .from("staff_members")
        .select("sort_order")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const nextSortOrder = maxSortOrder ? maxSortOrder.sort_order + 1 : 0;

      // Create staff member
      const { data: staff, error: insertError } = await supabase
        .from("staff_members")
        .insert({
          ...data,
          organization_id: organizationId,
          sort_order: data.sort_order ?? nextSortOrder,
          color: data.color || "#3B82F6",
          is_active: data.is_active !== undefined ? data.is_active : true,
          is_bookable: data.is_bookable !== undefined ? data.is_bookable : true,
          accepts_online_bookings:
            data.accepts_online_bookings !== undefined
              ? data.accepts_online_bookings
              : true,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating staff member:", insertError);
        return {
          success: false,
          error: "Error al crear el miembro del staff: " + insertError.message,
        };
      }

      return {
        success: true,
        staff: staff as StaffMember,
      };
    } catch (error) {
      console.error("Unexpected error creating staff member:", error);
      return {
        success: false,
        error: "Error inesperado al crear el miembro del staff",
      };
    }
  }

  /**
   * Update an existing staff member
   */
  static async update(
    staffId: string,
    data: Partial<StaffMemberFormData>,
    organizationId: string
  ): Promise<{ success: boolean; error?: string; staff?: StaffMember }> {
    try {
      const supabase = createClient();

      // Verify staff member exists and belongs to organization
      const { data: existingStaff, error: fetchError } = await supabase
        .from("staff_members")
        .select("*")
        .eq("id", staffId)
        .eq("organization_id", organizationId)
        .single();

      if (fetchError || !existingStaff) {
        return {
          success: false,
          error: "El miembro del staff no existe",
        };
      }

      // If email is being updated, check for duplicates
      if (data.email && data.email !== existingStaff.email) {
        const { data: duplicateStaff } = await supabase
          .from("staff_members")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("email", data.email)
          .neq("id", staffId)
          .single();

        if (duplicateStaff) {
          return {
            success: false,
            error: "Ya existe otro miembro del staff con ese email",
          };
        }
      }

      // Update staff member
      const { data: staff, error: updateError } = await supabase
        .from("staff_members")
        .update(data)
        .eq("id", staffId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating staff member:", updateError);
        return {
          success: false,
          error:
            "Error al actualizar el miembro del staff: " + updateError.message,
        };
      }

      return {
        success: true,
        staff: staff as StaffMember,
      };
    } catch (error) {
      console.error("Unexpected error updating staff member:", error);
      return {
        success: false,
        error: "Error inesperado al actualizar el miembro del staff",
      };
    }
  }

  /**
   * Get all staff members for an organization
   */
  static async getAll(
    organizationId: string,
    filters?: {
      isActive?: boolean;
      isBookable?: boolean;
      acceptsOnlineBookings?: boolean;
    }
  ): Promise<{
    success: boolean;
    staff?: StaffMember[];
    error?: string;
  }> {
    try {
      const supabase = createClient();

      let query = supabase
        .from("staff_members")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order");

      // Apply filters
      if (filters?.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }

      if (filters?.isBookable !== undefined) {
        query = query.eq("is_bookable", filters.isBookable);
      }

      if (filters?.acceptsOnlineBookings !== undefined) {
        query = query.eq(
          "accepts_online_bookings",
          filters.acceptsOnlineBookings
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching staff members:", error);
        return {
          success: false,
          error: "Error al cargar los miembros del staff",
        };
      }

      return {
        success: true,
        staff: data || [],
      };
    } catch (error) {
      console.error("Unexpected error fetching staff members:", error);
      return {
        success: false,
        error: "Error inesperado al cargar los miembros del staff",
      };
    }
  }

  /**
   * Get a single staff member by ID
   */
  static async getById(
    staffId: string,
    organizationId: string
  ): Promise<{
    success: boolean;
    staff?: StaffMember;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("staff_members")
        .select("*")
        .eq("id", staffId)
        .eq("organization_id", organizationId)
        .single();

      if (error) {
        console.error("Error fetching staff member:", error);
        return {
          success: false,
          error: "Error al cargar el miembro del staff",
        };
      }

      return {
        success: true,
        staff: data as StaffMember,
      };
    } catch (error) {
      console.error("Unexpected error fetching staff member:", error);
      return {
        success: false,
        error: "Error inesperado al cargar el miembro del staff",
      };
    }
  }

  /**
   * Deactivate a staff member (soft delete)
   */
  static async deactivate(
    staffId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("staff_members")
        .update({ is_active: false })
        .eq("id", staffId)
        .eq("organization_id", organizationId);

      if (error) {
        console.error("Error deactivating staff member:", error);
        return {
          success: false,
          error: "Error al desactivar el miembro del staff",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected error deactivating staff member:", error);
      return {
        success: false,
        error: "Error inesperado al desactivar el miembro del staff",
      };
    }
  }

  /**
   * Reactivate a staff member
   */
  static async reactivate(
    staffId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("staff_members")
        .update({ is_active: true })
        .eq("id", staffId)
        .eq("organization_id", organizationId);

      if (error) {
        console.error("Error reactivating staff member:", error);
        return {
          success: false,
          error: "Error al reactivar el miembro del staff",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected error reactivating staff member:", error);
      return {
        success: false,
        error: "Error inesperado al reactivar el miembro del staff",
      };
    }
  }

  /**
   * Reorder staff members
   */
  static async reorder(
    staffIds: string[],
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // Update sort_order for each staff member
      const updates = staffIds.map((id, index) =>
        supabase
          .from("staff_members")
          .update({ sort_order: index })
          .eq("id", id)
          .eq("organization_id", organizationId)
      );

      await Promise.all(updates);

      return { success: true };
    } catch (error) {
      console.error("Unexpected error reordering staff members:", error);
      return {
        success: false,
        error: "Error inesperado al reordenar los miembros del staff",
      };
    }
  }
}
