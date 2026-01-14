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

export const Badge = React.memo(function Badge({
  variant = "muted",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const baseClasses =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

  const variants = {
    primary:
      "bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400",
    secondary:
      "bg-secondary-100 text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-400",
    success:
      "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400",
    danger:
      "bg-danger-100 text-danger-800 dark:bg-danger-900/20 dark:text-danger-400",
    warning:
      "bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400",
    info: "bg-info-100 text-info-800 dark:bg-info-900/20 dark:text-info-400",
    muted: "bg-muted text-foreground-muted",
  };

  return (
    <span
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
});
