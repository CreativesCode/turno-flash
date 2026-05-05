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
  className?: string;
}

/**
 * Pill badge whose colors come from the `.st-{status}` class defined in
 * globals.css. The class exposes --st-c (accent), --st-cb (text on bg) and
 * --st-bg (soft tint), so the badge needs no per-status conditional styling.
 */
export const StatusBadge = React.memo(function StatusBadge({
  status,
  size = "md",
  hideDot = false,
  className = "",
}: StatusBadgeProps) {
  const meta = getStatusMeta(status);
  const padding = size === "sm" ? "px-2 py-[2px] text-[10px]" : "px-2.5 py-[3px] text-[11px]";
  const dotSize = size === "sm" ? 5 : 6;

  return (
    <span
      className={`st-${status} inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${padding} ${className}`}
      style={{
        background: "var(--st-bg)",
        color: "var(--st-cb)",
      }}
    >
      {!hideDot && (
        <span
          aria-hidden
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            background: "var(--st-c)",
          }}
        />
      )}
      {meta?.label ?? status}
    </span>
  );
});
