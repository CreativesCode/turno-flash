import { APPOINTMENT_STATUS } from "@/config/constants";
import { Customer, CustomerFormData } from "@/types/appointments";
import { createClient } from "@/utils/supabase/client";

/**
 * Service Layer for Customer Management
 * Handles all business logic related to customers
 */
export class CustomerService {
  /**
   * Validate customer form data
   */
  private static validateCustomerData(data: CustomerFormData): {
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

    if (!data.phone || data.phone.trim() === "") {
      errors.push("El teléfono es requerido");
    }

    // Validate email format if provided
    if (data.email && data.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push("El formato del email es inválido");
      }
    }

    // Validate phone format (basic check)
    if (data.phone && data.phone.length < 8) {
      errors.push("El teléfono debe tener al menos 8 dígitos");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a new customer
   */
  static async create(
    data: CustomerFormData,
    organizationId: string,
    userId: string
  ): Promise<{
    success: boolean;
    error?: string;
    customer?: Customer;
  }> {
    try {
      // Validate input data
      const validation = this.validateCustomerData(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(", "),
        };
      }

      const supabase = createClient();

      // Check if customer with same phone already exists
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("phone", data.phone)
        .single();

      if (existingCustomer) {
        return {
          success: false,
          error: "Ya existe un cliente con ese número de teléfono",
        };
      }

      // Create customer
      const { data: customer, error: insertError } = await supabase
        .from("customers")
        .insert({
          ...data,
          organization_id: organizationId,
          created_by: userId,
          phone_country_code: data.phone_country_code || "+54",
          is_active: data.is_active !== undefined ? data.is_active : true,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating customer:", insertError);
        return {
          success: false,
          error: "Error al crear el cliente: " + insertError.message,
        };
      }

      return {
        success: true,
        customer: customer as Customer,
      };
    } catch (error) {
      console.error("Unexpected error creating customer:", error);
      return {
        success: false,
        error: "Error inesperado al crear el cliente",
      };
    }
  }

  /**
   * Update an existing customer
   */
  static async update(
    customerId: string,
    data: Partial<CustomerFormData>,
    organizationId: string
  ): Promise<{ success: boolean; error?: string; customer?: Customer }> {
    try {
      const supabase = createClient();

      // Verify customer exists and belongs to organization
      const { data: existingCustomer, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .eq("organization_id", organizationId)
        .single();

      if (fetchError || !existingCustomer) {
        return {
          success: false,
          error: "El cliente no existe",
        };
      }

      // If phone is being updated, check for duplicates
      if (data.phone && data.phone !== existingCustomer.phone) {
        const { data: duplicateCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("phone", data.phone)
          .neq("id", customerId)
          .single();

        if (duplicateCustomer) {
          return {
            success: false,
            error: "Ya existe otro cliente con ese número de teléfono",
          };
        }
      }

      // Update customer
      const { data: customer, error: updateError } = await supabase
        .from("customers")
        .update(data)
        .eq("id", customerId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating customer:", updateError);
        return {
          success: false,
          error: "Error al actualizar el cliente: " + updateError.message,
        };
      }

      return {
        success: true,
        customer: customer as Customer,
      };
    } catch (error) {
      console.error("Unexpected error updating customer:", error);
      return {
        success: false,
        error: "Error inesperado al actualizar el cliente",
      };
    }
  }

  /**
   * Get all customers for an organization
   */
  static async getAll(
    organizationId: string,
    filters?: {
      isActive?: boolean;
      search?: string;
    }
  ): Promise<{
    success: boolean;
    customers?: Customer[];
    error?: string;
  }> {
    try {
      const supabase = createClient();

      let query = supabase
        .from("customers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("first_name");

      // Apply filters
      if (filters?.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }

      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching customers:", error);
        return {
          success: false,
          error: "Error al cargar los clientes",
        };
      }

      return {
        success: true,
        customers: data || [],
      };
    } catch (error) {
      console.error("Unexpected error fetching customers:", error);
      return {
        success: false,
        error: "Error inesperado al cargar los clientes",
      };
    }
  }

  /**
   * Get a single customer by ID
   */
  static async getById(
    customerId: string,
    organizationId: string
  ): Promise<{
    success: boolean;
    customer?: Customer;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .eq("organization_id", organizationId)
        .single();

      if (error) {
        console.error("Error fetching customer:", error);
        return {
          success: false,
          error: "Error al cargar el cliente",
        };
      }

      return {
        success: true,
        customer: data as Customer,
      };
    } catch (error) {
      console.error("Unexpected error fetching customer:", error);
      return {
        success: false,
        error: "Error inesperado al cargar el cliente",
      };
    }
  }

  /**
   * Deactivate a customer (soft delete)
   */
  static async deactivate(
    customerId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("customers")
        .update({ is_active: false })
        .eq("id", customerId)
        .eq("organization_id", organizationId);

      if (error) {
        console.error("Error deactivating customer:", error);
        return {
          success: false,
          error: "Error al desactivar el cliente",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected error deactivating customer:", error);
      return {
        success: false,
        error: "Error inesperado al desactivar el cliente",
      };
    }
  }

  /**
   * Reactivate a customer
   */
  static async reactivate(
    customerId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("customers")
        .update({ is_active: true })
        .eq("id", customerId)
        .eq("organization_id", organizationId);

      if (error) {
        console.error("Error reactivating customer:", error);
        return {
          success: false,
          error: "Error al reactivar el cliente",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected error reactivating customer:", error);
      return {
        success: false,
        error: "Error inesperado al reactivar el cliente",
      };
    }
  }

  /**
   * Get customer statistics
   */
  static async getStatistics(
    customerId: string,
    organizationId: string
  ): Promise<{
    success: boolean;
    stats?: {
      totalAppointments: number;
      completedAppointments: number;
      missedAppointments: number;
      cancelledAppointments: number;
      lastAppointmentDate: string | null;
    };
    error?: string;
  }> {
    try {
      const supabase = createClient();

      const { data: customer, error } = await supabase
        .from("customers")
        .select(
          "total_appointments, missed_appointments, last_appointment_date"
        )
        .eq("id", customerId)
        .eq("organization_id", organizationId)
        .single();

      if (error) {
        console.error("Error fetching customer statistics:", error);
        return {
          success: false,
          error: "Error al cargar las estadísticas",
        };
      }

      // Get completed and cancelled counts
      const { data: appointments } = await supabase
        .from("appointments")
        .select("status")
        .eq("customer_id", customerId)
        .eq("organization_id", organizationId);

      const completedAppointments =
        appointments?.filter((a) => a.status === APPOINTMENT_STATUS.COMPLETED).length || 0;
      const cancelledAppointments =
        appointments?.filter((a) => a.status === APPOINTMENT_STATUS.CANCELLED).length || 0;

      return {
        success: true,
        stats: {
          totalAppointments: customer.total_appointments || 0,
          completedAppointments,
          missedAppointments: customer.missed_appointments || 0,
          cancelledAppointments,
          lastAppointmentDate: customer.last_appointment_date,
        },
      };
    } catch (error) {
      console.error("Unexpected error fetching customer statistics:", error);
      return {
        success: false,
        error: "Error inesperado al cargar las estadísticas",
      };
    }
  }
}
