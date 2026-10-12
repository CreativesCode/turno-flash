"use client";

import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "./spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-solid"
  | "whatsapp";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner before the label and marks the button as busy. */
  loading?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  // One per screen: the main action
  primary: "bg-primary text-primary-foreground hover:brightness-95",
  secondary:
    "bg-surface border border-border-2 text-foreground hover:bg-muted",
  ghost:
    "bg-transparent text-foreground-muted hover:bg-muted hover:text-foreground",
  danger:
    "bg-surface border border-border-2 text-danger-600 dark:text-danger-400 hover:bg-danger-100 dark:hover:bg-danger-900",
  // Only for the confirm button of ConfirmSheet
  "danger-solid": "bg-danger text-white hover:brightness-95",
  whatsapp:
    "bg-secondary-100 text-secondary-600 dark:bg-secondary-900 dark:text-secondary-400 hover:brightness-95",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 rounded-[10px] text-meta",
  md: "h-11 px-[18px] rounded-control text-body",
  lg: "h-[54px] px-[22px] rounded-[14px] text-[16px]",
  icon: "h-11 w-11 rounded-control",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className = "",
      disabled,
      loading = false,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold transition-[background-color,filter] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-100 dark:focus-visible:ring-primary-900";

    return (
      <button
        ref={ref}
        className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        disabled={disabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Spinner size={16} />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// Memoize the button component to prevent unnecessary re-renders
export const MemoizedButton = React.memo(Button);
