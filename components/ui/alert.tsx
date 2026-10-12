"use client";

import React, { HTMLAttributes, ReactNode } from "react";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "danger" | "warning" | "info";
  /** 18px icon shown to the left of the content. */
  icon?: ReactNode;
}

const VARIANTS: Record<NonNullable<AlertProps["variant"]>, string> = {
  success:
    "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-400",
  danger:
    "bg-danger-100 text-danger-600 dark:bg-danger-900 dark:text-danger-400",
  warning:
    "bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-400",
  info: "bg-surface-2 text-foreground-muted",
};

export const Alert = React.memo(function Alert({
  variant = "info",
  icon,
  className = "",
  children,
  ...props
}: AlertProps) {
  return (
    <div
      className={`rounded-card p-4 text-meta ${icon ? "flex gap-3" : ""} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0 [&>svg]:size-4.5">{icon}</span>}
      {icon ? <div className="min-w-0 flex-1">{children}</div> : children}
    </div>
  );
});
