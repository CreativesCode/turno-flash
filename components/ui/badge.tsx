"use client";

import React, { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "muted";
}

const PRIMARY =
  "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-400";
const MUTED = "bg-surface-2 text-foreground-muted";

const VARIANTS: Record<NonNullable<BadgeProps["variant"]>, string> = {
  primary: PRIMARY,
  success: PRIMARY,
  secondary:
    "bg-secondary-100 text-secondary-600 dark:bg-secondary-900 dark:text-secondary-400",
  danger:
    "bg-danger-100 text-danger-600 dark:bg-danger-900 dark:text-danger-400",
  warning:
    "bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-400",
  info: MUTED,
  muted: MUTED,
};

/** The "Tag" of the v2 design: a small flat label, no border. */
export const Badge = React.memo(function Badge({
  variant = "muted",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-tag px-[9px] text-caption font-semibold ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
});
