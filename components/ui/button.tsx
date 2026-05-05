"use client";

import React, { ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "ghost"
  | "mesh-primary"
  | "mesh-secondary"
  | "soft";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANTS: Record<ButtonVariant, string> = {
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
    "bg-surface text-foreground hover:bg-muted border border-border focus:ring-border-2",
  // Brand mesh-gradient buttons (for FAB, hero CTAs, primary dashboard tiles).
  // The `mesh-*` class defines the gradient; `shadow-glow-*` colors the drop.
  "mesh-primary":
    "mesh-primary text-white shadow-glow-primary hover:brightness-110 focus:ring-primary-500",
  "mesh-secondary":
    "mesh-secondary text-white shadow-glow-secondary hover:brightness-110 focus:ring-secondary-500",
  // Tinted soft button — low emphasis but on-brand (e.g. "Invitar usuario").
  soft: "bg-primary-50 text-primary-700 hover:bg-primary-100 focus:ring-primary-500 dark:bg-primary-900/20 dark:text-primary-400",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
  icon: "h-9 w-9 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className = "", disabled, ...props },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center rounded-md font-medium transition-[background-color,filter,box-shadow,transform] focus:outline-none focus:ring-2 focus:ring-offset-2 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50";

    return (
      <button
        ref={ref}
        className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

// Memoize the button component to prevent unnecessary re-renders
export const MemoizedButton = React.memo(Button);
