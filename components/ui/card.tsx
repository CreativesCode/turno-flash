"use client";

import React, { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes the default border + shadow for nested or right-rail contexts. */
  flat?: boolean;
}

export const Card = React.memo(function Card({
  flat = false,
  className = "",
  children,
  ...props
}: CardProps) {
  const base = "bg-surface rounded-xl";
  const elevation = flat ? "" : "border border-border shadow-sm";
  return (
    <div className={`${base} ${elevation} ${className}`} {...props}>
      {children}
    </div>
  );
});
