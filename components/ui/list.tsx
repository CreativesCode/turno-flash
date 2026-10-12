import { HTMLAttributes, ReactNode } from "react";

/**
 * Grouped list: one bordered card whose rows are split by hairlines. The
 * dividers come from the 1px gap over the border colour, so rows carry no
 * border of their own.
 */
export function ListGroup({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`grid gap-px overflow-hidden rounded-card border border-border bg-border shadow-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ListRowProps {
  /** Time block, Avatar, swatch or IconTile. */
  leading?: ReactNode;
  title: ReactNode;
  /** Shown at the right end of the title line (price, number…). */
  titleAside?: ReactNode;
  subtitle?: ReactNode;
  /** Color of the small square before the subtitle (the service's). */
  subtitleDot?: string;
  /** StatusBadge, Switch, chevron, KebabMenu… */
  trailing?: ReactNode;
  /** Fades the row: completed, cancelled, paused. */
  dimmed?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ListRow({
  leading,
  title,
  titleAside,
  subtitle,
  subtitleDot,
  trailing,
  dimmed = false,
  onClick,
  className = "",
}: ListRowProps) {
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-body font-semibold text-foreground">
            {title}
          </span>
          {titleAside && <span className="ml-auto shrink-0">{titleAside}</span>}
        </div>
        {subtitle && (
          <div className="mt-[3px] flex items-center gap-1.5 text-meta text-foreground-muted">
            {subtitleDot && (
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-[2px]"
                style={{ background: subtitleDot }}
              />
            )}
            <span className="truncate">{subtitle}</span>
          </div>
        )}
      </div>
    </>
  );
  const layout = "flex min-w-0 flex-1 items-center gap-3.5 text-left";

  // The trailing control stays outside the button: a Switch or a menu inside
  // it would be a button within a button
  return (
    <div
      className={`flex items-center gap-3.5 bg-surface px-4 py-3.5 ${
        onClick ? "transition-colors hover:bg-muted" : ""
      } ${dimmed ? "opacity-55" : ""} ${className}`}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className={`${layout} cursor-pointer`}>
          {content}
        </button>
      ) : (
        <div className={layout}>{content}</div>
      )}
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

/** Leading block of an appointment row: the time over its duration. */
export function TimeBlock({ time, detail }: { time: string; detail?: string }) {
  return (
    <div className="flex min-w-12 flex-col gap-0.5">
      <span className="font-mono text-body font-medium tabular-nums text-foreground">
        {time}
      </span>
      {detail && (
        <span className="text-caption text-foreground-subtle">{detail}</span>
      )}
    </div>
  );
}
