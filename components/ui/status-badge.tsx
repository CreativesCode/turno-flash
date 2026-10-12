"use client";

import React from "react";
import type { AppointmentStatus } from "@/types/appointments";
import { getStatusMeta } from "@/utils/appointment-status";

export interface StatusBadgeProps {
  status: AppointmentStatus;
  /** Compact rendering for tight spots like calendar blocks. */
  size?: "sm" | "md";
  /** Hide the leading colored dot. */
  hideDot?: boolean;
  /** Text after the label, e.g. the time of the change: "Llegó · 11:24". */
  suffix?: string;
  className?: string;
}

/**
 * Neutral pill; the status only colours the dot, through the --st-c variable
 * that the `.st-{status}` class of globals.css exposes.
 */
export const StatusBadge = React.memo(function StatusBadge({
  status,
  size = "md",
  hideDot = false,
  suffix,
  className = "",
}: StatusBadgeProps) {
  const meta = getStatusMeta(status);
  const sizing =
    size === "sm" ? "h-[22px] px-2 text-[11px]" : "h-[26px] px-2.5 text-caption";

  return (
    <span
      className={`st-${status} inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-2 font-medium text-foreground-muted ${sizing} ${className}`}
    >
      {!hideDot && (
        <span
          aria-hidden
          className="size-[7px] shrink-0 rounded-full bg-[var(--st-c)]"
        />
      )}
      {meta?.label ?? status}
      {suffix && ` · ${suffix}`}
    </span>
  );
});
