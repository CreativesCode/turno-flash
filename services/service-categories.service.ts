import { ServiceCategory } from "@/types/appointments";
import { createClient } from "@/utils/supabase/client";
import { Logger } from "@/utils/logger";

export interface ServiceCategoryInput {
  name: string;
  description?: string | null;
}

type Result<T = undefined> = { success: boolean; error?: string; data?: T };

const DUPLICATE_NAME = "Ya existe una categoría con ese nombre";
// RLS rejects silently: zero rows means no permission (or expired license)
const NO_PERMISSION = "No tienes permiso para cambiar las categorías";

function cleanInput(input: ServiceCategoryInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
  };
}

/**
 * Service categories (PRP-004): one level, optional. Order is sort_order then
 * name, the same order public_booking_info uses.
 */
export class ServiceCategoryService {
  static async getAll(
    organizationId: string
  ): Promise<Result<ServiceCategory[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("service_categories")
      .select("*")
      .eq("organization_id", organizationId)
      .order("sort_order")
      .order("name");

    if (error) {
      void Logger.error("Error fetching service categories:", error);
      return { success: false, error: "Error al cargar las categorías" };
    }
    return { success: true, data: data ?? [] };
  }

  static async create(
    input: ServiceCategoryInput,
    organizationId: string
  ): Promise<Result<ServiceCategory>> {
    const supabase = createClient();
    const { data: last } = await supabase
      .from("service_categories")
      .select("sort_order")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("service_categories")
      .insert({
        ...cleanInput(input),
        organization_id: organizationId,
        sort_order: (last?.sort_order ?? -1) + 1,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return { success: false, error: DUPLICATE_NAME };
      void Logger.error("Error creating service category:", error);
      return {
        success: false,
        error: error.code === "42501" ? NO_PERMISSION : "Error al crear la categoría",
      };
    }
    return { success: true, data };
  }

  static async update(
    categoryId: string,
    input: ServiceCategoryInput,
    organizationId: string
  ): Promise<Result> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("service_categories")
      .update(cleanInput(input))
      .eq("id", categoryId)
      .eq("organization_id", organizationId)
      .select("id");

    if (error) {
      if (error.code === "23505") return { success: false, error: DUPLICATE_NAME };
      void Logger.error("Error updating service category:", error);
      return { success: false, error: "Error al guardar la categoría" };
    }
    if (!data?.length) return { success: false, error: NO_PERMISSION };
    return { success: true };
  }

  /** Services of a deleted category become "no category" (FK SET NULL). */
  static async delete(
    categoryId: string,
    organizationId: string
  ): Promise<Result> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("service_categories")
      .delete()
      .eq("id", categoryId)
      .eq("organization_id", organizationId)
      .select("id");

    if (error) {
      void Logger.error("Error deleting service category:", error);
      return { success: false, error: "Error al borrar la categoría" };
    }
    if (!data?.length) return { success: false, error: NO_PERMISSION };
    return { success: true };
  }

  /** Saves the given order: position in the array = sort_order. */
  static async reorder(
    categoryIds: string[],
    organizationId: string
  ): Promise<Result> {
    const supabase = createClient();
    const results = await Promise.all(
      categoryIds.map((id, index) =>
        supabase
          .from("service_categories")
          .update({ sort_order: index })
          .eq("id", id)
          .eq("organization_id", organizationId)
          .select("id")
      )
    );

    const failed = results.find((r) => r.error || !r.data?.length);
    if (failed) {
      if (failed.error) {
        void Logger.error("Error reordering service categories:", failed.error);
      }
      return {
        success: false,
        error: failed.error ? "Error al ordenar las categorías" : NO_PERMISSION,
      };
    }
    return { success: true };
  }
}
