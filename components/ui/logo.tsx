interface LogoProps {
  size?: number;
  /** Adds the "turnoflash" wordmark next to the mark. */
  withWordmark?: boolean;
  className?: string;
  /** Unused since the mark is inline SVG; kept so call sites don't break. */
  priority?: boolean;
}

/**
 * The "3a" mark: two slanted agenda rows plus the fuchsia dot of "the turn
 * of now". Inline SVG so it follows the theme colours.
 */
export function Logo({
  size = 28,
  withWordmark = false,
  className = "",
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        role={withWordmark ? undefined : "img"}
        aria-hidden={withWordmark || undefined}
        aria-label={withWordmark ? undefined : "TurnoFlash"}
        className="shrink-0"
      >
        <g transform="skewX(-20)">
          <rect x="17" y="8" width="30" height="10" rx="5" className="fill-primary" />
          <rect x="19" y="21" width="20" height="10" rx="5" className="fill-primary" />
        </g>
        <circle cx="12.5" cy="39" r="5.2" className="fill-secondary" />
      </svg>
      {withWordmark && (
        <span
          className="font-bold tracking-[-0.045em] text-foreground"
          style={{ fontSize: Math.round(size * 0.72) }}
        >
          turno<span className="text-primary">flash</span>
        </span>
      )}
    </span>
  );
}
