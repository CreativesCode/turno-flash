import { supportWhatsAppUrl, type SupportTopic } from "@/config/constants";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";

/**
 * Support chat link whose message already says which business is writing,
 * so the admin does not have to ask.
 */
export function useSupportWhatsAppUrl(topic: SupportTopic): string {
  const { modules } = useOrganizationModules();
  return supportWhatsAppUrl(topic, modules.name);
}
