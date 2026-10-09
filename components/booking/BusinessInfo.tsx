"use client";

import { MessageCircle } from "lucide-react";

/**
 * WhatsApp link to the business for the public pages (P3-10). Renders
 * nothing when the business has no contact number loaded.
 */
export function BusinessContactLink({
  phone,
  className = "",
}: {
  phone: string | null | undefined;
  className?: string;
}) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      Escribir al negocio
    </a>
  );
}

function wallClock(timeZone?: string): string {
  return new Date().toLocaleString("en-US", {
    timeZone,
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Shown only to someone whose device clock differs from the business clock
 * (P3-12): every time on the page is the business local time.
 */
export function BusinessTimeNote({ timezone }: { timezone: string }) {
  let sameClock = true;
  try {
    sameClock = wallClock(timezone) === wallClock();
  } catch {
    // Unknown timezone name: say nothing
  }
  if (sameClock) return null;

  return (
    <p className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-foreground-muted">
      Los horarios son en la hora local del negocio.
    </p>
  );
}
