import { SUPPORT_WHATSAPP_URL } from "@/config/constants";
import { MessageCircle } from "lucide-react";

/**
 * The only way to activate or renew a license from Cuba (D-10): a WhatsApp
 * chat with support. Styled like the primary button.
 */
export function SupportWhatsAppLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={SUPPORT_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`mesh-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-glow-primary transition-[filter] hover:brightness-110 ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      Escribir a soporte por WhatsApp
    </a>
  );
}
