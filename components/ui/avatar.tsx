"use client";

import React, { CSSProperties, HTMLAttributes } from "react";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** Full name; first two initials are derived from it. */
  name: string;
  /** Own color (staff): tints the background and colors the initials. */
  color?: string;
  /** Picks the palette pair; pass the record id. Defaults to the name. */
  seed?: string;
  /** Square size in pixels. Default 36. */
  size?: number;
}

/** Soft background + dark text of the same hue. */
const PALETTE: [string, string][] = [
  ["#e4e7fb", "#3f43b8"],
  ["#dcefe2", "#1d6d3d"],
  ["#fbe9d3", "#9a5a0f"],
  ["#f8e1ec", "#a3215c"],
  ["#dfeefa", "#1f5e95"],
];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

function pickPair(seed: string): [string, string] {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return PALETTE[sum % PALETTE.length];
}

export const Avatar = React.memo(function Avatar({
  name,
  color,
  seed,
  size = 36,
  className = "",
  style,
  ...props
}: AvatarProps) {
  const [bg, fg] = color
    ? [`color-mix(in srgb, ${color} 13%, transparent)`, color]
    : pickPair(seed ?? name);
  // The palette is for light surfaces; in dark it goes neutral
  const tone = color
    ? "bg-[var(--av-bg)] text-[var(--av-fg)]"
    : "bg-[var(--av-bg)] text-[var(--av-fg)] dark:bg-surface-2 dark:text-foreground-muted";

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tone} ${className}`}
      style={
        {
          width: size,
          height: size,
          fontSize: Math.round(size * 0.36),
          "--av-bg": bg,
          "--av-fg": fg,
          ...style,
        } as CSSProperties
      }
      aria-label={name}
      {...props}
    >
      {getInitials(name)}
    </div>
  );
});
