"use client";

import { useIsStoreApp } from "@/hooks/useIsStoreApp";
import { useSupportWhatsAppUrl } from "@/hooks/useSupportWhatsAppUrl";
import { MessageCircle } from "lucide-react";

/**
 * The only way to activate or renew a license from Cuba (D-10): a WhatsApp
 * chat with support. Styled like the primary button.
 */
export function SupportWhatsAppLink({ className = "" }: { className?: string }) {
  const storeApp = useIsStoreApp();
  const href = useSupportWhatsAppUrl(storeApp ? "help" : "license");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`bg-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-[filter] hover:brightness-110 ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      Escribir a soporte por WhatsApp
    </a>
  );
}
