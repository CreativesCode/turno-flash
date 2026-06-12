import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/utils/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Ajustes de automatización del negocio (business_settings).
 * RLS: owners gestionan los de su organización; admins los de cualquiera (015).
 */

export interface BusinessAutomationSettings {
  organization_id: string;
  whatsapp_integration_enabled: boolean;
  enable_rating_request: boolean;
  enable_daily_summary: boolean;
  /** Hora local de la organización, formato HH:MM[:SS] */
  daily_summary_time: string | null;
}

export type BusinessAutomationSettingsPatch = Partial<
  Omit<BusinessAutomationSettings, "organization_id">
>;

export const businessSettingsKeys = {
  all: ["business-settings"] as const,
  org: (orgId: string) => [...businessSettingsKeys.all, orgId] as const,
};

export function useBusinessSettings() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || "";

  return useQuery({
    queryKey: businessSettingsKeys.org(orgId),
    queryFn: async (): Promise<BusinessAutomationSettings | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("business_settings")
        .select(
          "organization_id, whatsapp_integration_enabled, enable_rating_request, enable_daily_summary, daily_summary_time"
        )
        .eq("organization_id", orgId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return (data as BusinessAutomationSettings | null) ?? null;
    },
    enabled: !!orgId,
    staleTime: 1000 * 60,
  });
}

export function useUpdateBusinessSettings() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: BusinessAutomationSettingsPatch) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }
      const supabase = createClient();
      // Upsert: la fila puede no existir aún para la organización
      const { error } = await supabase
        .from("business_settings")
        .upsert(
          { organization_id: profile.organization_id, ...patch },
          { onConflict: "organization_id" }
        );

      if (error) throw new Error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: businessSettingsKeys.all });
    },
  });
}
