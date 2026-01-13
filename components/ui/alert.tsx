"use client";

import { HTMLAttributes } from "react";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "danger" | "warning" | "info";
}

export function Alert({
  variant = "info",
  className = "",
  children,
  ...props
}: AlertProps) {
  const baseClasses = "rounded-md p-4 text-sm";

  const variants = {
    success:
      "bg-success-50 text-success-800 dark:bg-success-900/20 dark:text-success-400",
    danger:
      "bg-danger-50 text-danger-800 dark:bg-danger-900/20 dark:text-danger-400",
    warning:
      "bg-warning-50 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400",
    info: "bg-info-50 text-info-800 dark:bg-info-900/20 dark:text-info-400",
  };

  return (
    <div
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
