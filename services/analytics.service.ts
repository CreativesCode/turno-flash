import type { OrganizationAnalytics, PlatformStats } from "@/types/analytics";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";

/**
 * Service Layer for Analytics Dashboards
 * Thin wrappers over the SQL RPCs from migration 022_analytics_functions.sql.
 * All aggregation happens in Postgres; the client only receives one JSON.
 */
export class AnalyticsService {
  /**
   * Métricas de una organización para /dashboard/reports.
   * owner: siempre su organización. admin: puede pasar organizationId.
   */
  static async getOrganizationAnalytics(
    startDate: string,
    endDate: string,
    organizationId?: string
  ): Promise<{
    success: boolean;
    data?: OrganizationAnalytics;
    error?: string;
  }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_organization_analytics", {
        p_start_date: startDate,
        p_end_date: endDate,
        p_organization_id: organizationId,
      });

      if (error) {
        void Logger.error("Error fetching organization analytics:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as unknown as OrganizationAnalytics };
    } catch (error) {
      void Logger.error("Unexpected error fetching organization analytics:", error);
      return { success: false, error: "Error inesperado al cargar los reportes" };
    }
  }

  /**
   * Métricas globales de la plataforma para /dashboard/platform (solo admin).
   */
  static async getPlatformStats(): Promise<{
    success: boolean;
    data?: PlatformStats;
    error?: string;
  }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_admin_platform_stats");

      if (error) {
        void Logger.error("Error fetching platform stats:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as unknown as PlatformStats };
    } catch (error) {
      void Logger.error("Unexpected error fetching platform stats:", error);
      return {
        success: false,
        error: "Error inesperado al cargar las estadísticas de la plataforma",
      };
    }
  }
}
