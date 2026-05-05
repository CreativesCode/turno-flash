"use client";

import React, { HTMLAttributes } from "react";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** Full name; first two initials are derived from it. */
  name: string;
  /** Background color (any valid CSS color). Defaults to the primary brand. */
  color?: string;
  /** Square size in pixels. Default 36. */
  size?: number;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

export const Avatar = React.memo(function Avatar({
  name,
  color,
  size = 36,
  className = "",
  style,
  ...props
}: AvatarProps) {
  return (
    <div
      className={`inline-flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: color ?? "var(--color-primary-500)",
        fontSize: Math.round(size * 0.38),
        boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.15)",
        ...style,
      }}
      aria-label={name}
      {...props}
    >
      {getInitials(name)}
    </div>
  );
});
