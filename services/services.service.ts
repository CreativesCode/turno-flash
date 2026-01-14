import { Service, ServiceFormData } from "@/types/appointments";
import { createClient } from "@/utils/supabase/client";

/**
 * Service Layer for Service Management
 * Handles all business logic related to services
 */
export class ServiceService {
  /**
   * Validate service form data
   */
  private static validateServiceData(data: ServiceFormData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.name || data.name.trim() === "") {
      errors.push("El nombre del servicio es requerido");
    }

    if (!data.duration_minutes || data.duration_minutes <= 0) {
      errors.push("La duración debe ser mayor a 0 minutos");
    }

    if (data.duration_minutes && data.duration_minutes > 1440) {
      errors.push("La duración no puede ser mayor a 24 horas");
    }

    if (data.buffer_time_minutes && data.buffer_time_minutes < 0) {
      errors.push("El tiempo de buffer no puede ser negativo");
    }

    if (data.price && data.price < 0) {
      errors.push("El precio no puede ser negativo");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a new service
   */
  static async create(
    data: ServiceFormData,
    organizationId: string
  ): Promise<{
    success: boolean;
    error?: string;
    service?: Service;
  }> {
    try {
      // Validate input data
      const validation = this.validateServiceData(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(", "),
        };
      }

      const supabase = createClient();

      // Check if service with same name already exists
      const { data: existingService } = await supabase
        .from("services")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("name", data.name)
        .single();

      if (existingService) {
        return {
          success: false,
          error: "Ya existe un servicio con ese nombre",
        };
      }

      // Get the max sort_order to append at the end
      const { data: maxSortOrder } = await supabase
        .from("services")
        .select("sort_order")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const nextSortOrder = maxSortOrder ? maxSortOrder.sort_order + 1 : 0;

      // Create service
      const { data: service, error: insertError } = await supabase
        .from("services")
        .insert({
          ...data,
          organization_id: organizationId,
          sort_order: data.sort_order ?? nextSortOrder,
          buffer_time_minutes: data.buffer_time_minutes || 0,
          currency: data.currency || "ARS",
          color: data.color || "#3B82F6",
          is_active: data.is_active !== undefined ? data.is_active : true,
          requires_approval:
            data.requires_approval !== undefined
              ? data.requires_approval
              : false,
          available_for_online_booking:
            data.available_for_online_booking !== undefined
              ? data.available_for_online_booking
              : true,
          max_advance_booking_days: data.max_advance_booking_days || 30,
          min_advance_booking_hours: data.min_advance_booking_hours || 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating service:", insertError);
        return {
          success: false,
          error: "Error al crear el servicio: " + insertError.message,
        };
      }

      return {
        success: true,
        service: service as Service,
      };
    } catch (error) {
      console.error("Unexpected error creating service:", error);
      return {
        success: false,
        error: "Error inesperado al crear el servicio",
      };
    }
  }

  /**
   * Update an existing service
   */
  static async update(
    serviceId: string,
    data: Partial<ServiceFormData>,
    organizationId: string
  ): Promise<{ success: boolean; error?: string; service?: Service }> {
    try {
      const supabase = createClient();

      // Verify service exists and belongs to organization
      const { data: existingService, error: fetchError } = await supabase
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .eq("organization_id", organizationId)
        .single();

      if (fetchError || !existingService) {
        return {
          success: false,
          error: "El servicio no existe",
        };
      }

      // If name is being updated, check for duplicates
      if (data.name && data.name !== existingService.name) {
        const { data: duplicateService } = await supabase
          .from("services")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("name", data.name)
          .neq("id", serviceId)
          .single();

        if (duplicateService) {
          return {
            success: false,
            error: "Ya existe otro servicio con ese nombre",
          };
        }
      }

      // Update service
      const { data: service, error: updateError } = await supabase
        .from("services")
        .update(data)
        .eq("id", serviceId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating service:", updateError);
        return {
          success: false,
          error: "Error al actualizar el servicio: " + updateError.message,
        };
      }

      return {
        success: true,
        service: service as Service,
      };
    } catch (error) {
      console.error("Unexpected error updating service:", error);
      return {
        success: false,
        error: "Error inesperado al actualizar el servicio",
      };
    }
  }

  /**
   * Get all services for an organization
   */
  static async getAll(
    organizationId: string,
    filters?: {
      isActive?: boolean;
      categoryId?: string;
      availableForOnlineBooking?: boolean;
    }
  ): Promise<{
    success: boolean;
    services?: Service[];
    error?: string;
  }> {
    try {
      const supabase = createClient();

      let query = supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order");

      // Apply filters
      if (filters?.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }

      if (filters?.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters?.availableForOnlineBooking !== undefined) {
        query = query.eq(
          "available_for_online_booking",
          filters.availableForOnlineBooking
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching services:", error);
        return {
          success: false,
          error: "Error al cargar los servicios",
        };
      }

      return {
        success: true,
        services: data || [],
      };
    } catch (error) {
      console.error("Unexpected error fetching services:", error);
      return {
        success: false,
        error: "Error inesperado al cargar los servicios",
      };
    }
  }

  /**
   * Get a single service by ID
   */
  static async getById(
    serviceId: string,
    organizationId: string
  ): Promise<{
    success: boolean;
    service?: Service;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .eq("organization_id", organizationId)
        .single();

      if (error) {
        console.error("Error fetching service:", error);
        return {
          success: false,
          error: "Error al cargar el servicio",
        };
      }

      return {
        success: true,
        service: data as Service,
      };
    } catch (error) {
      console.error("Unexpected error fetching service:", error);
      return {
        success: false,
        error: "Error inesperado al cargar el servicio",
      };
    }
  }

  /**
   * Deactivate a service (soft delete)
   */
  static async deactivate(
    serviceId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("services")
        .update({ is_active: false })
        .eq("id", serviceId)
        .eq("organization_id", organizationId);

      if (error) {
        console.error("Error deactivating service:", error);
        return {
          success: false,
          error: "Error al desactivar el servicio",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected error deactivating service:", error);
      return {
        success: false,
        error: "Error inesperado al desactivar el servicio",
      };
    }
  }

  /**
   * Reactivate a service
   */
  static async reactivate(
    serviceId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("services")
        .update({ is_active: true })
        .eq("id", serviceId)
        .eq("organization_id", organizationId);

      if (error) {
        console.error("Error reactivating service:", error);
        return {
          success: false,
          error: "Error al reactivar el servicio",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected error reactivating service:", error);
      return {
        success: false,
        error: "Error inesperado al reactivar el servicio",
      };
    }
  }

  /**
   * Reorder services
   */
  static async reorder(
    serviceIds: string[],
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // Update sort_order for each service
      const updates = serviceIds.map((id, index) =>
        supabase
          .from("services")
          .update({ sort_order: index })
          .eq("id", id)
          .eq("organization_id", organizationId)
      );

      await Promise.all(updates);

      return { success: true };
    } catch (error) {
      console.error("Unexpected error reordering services:", error);
      return {
        success: false,
        error: "Error inesperado al reordenar los servicios",
      };
    }
  }
}
