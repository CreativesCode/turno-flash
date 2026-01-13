"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className = "", disabled, ...props },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    const variants = {
      primary:
        "bg-primary text-primary-foreground hover:bg-primary-700 focus:ring-primary-500",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary-700 focus:ring-secondary-500",
      success:
        "bg-success text-success-foreground hover:bg-success-700 focus:ring-success-500",
      danger:
        "bg-danger text-danger-foreground hover:bg-danger-700 focus:ring-danger-500",
      warning:
        "bg-warning text-warning-foreground hover:bg-warning-700 focus:ring-warning-500",
      info: "bg-info text-info-foreground hover:bg-info-700 focus:ring-info-500",
      ghost:
        "bg-transparent text-foreground hover:bg-muted border border-border",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
