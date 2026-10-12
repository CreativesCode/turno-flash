import { ReactNode } from "react";
import { Spinner } from "./spinner";

export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Buttons at the right end, e.g. the "Nuevo" of the screen. */
  actions?: ReactNode;
  /** SearchInput, FilterChips… stacked under the title. */
  children?: ReactNode;
  className?: string;
}

/** Screen title in the display font. Not sticky: the topbar is what stays. */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={className}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-display text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-meta text-foreground-subtle">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {children && <div className="flex flex-col gap-4 pt-[18px]">{children}</div>}
    </header>
  );
}

export interface SectionLabelProps {
  children: ReactNode;
  count?: number;
  /** Link or button at the right end, e.g. "Ver agenda". */
  action?: ReactNode;
  className?: string;
}

/** Label over a group. Sentence case, never uppercase. */
export function SectionLabel({
  children,
  count,
  action,
  className = "",
}: SectionLabelProps) {
  return (
    <div
      className={`flex items-center gap-2 px-1 pb-2.5 pt-7 text-meta font-semibold text-foreground-muted ${className}`}
    >
      <span>{children}</span>
      {count !== undefined && (
        <span className="font-mono font-medium tabular-nums text-foreground-subtle">
          {count}
        </span>
      )}
      {action && (
        <span className="ml-auto text-primary-700 dark:text-primary-400">
          {action}
        </span>
      )}
    </div>
  );
}

export type IconTileTone = "neutral" | "primary" | "pink" | "danger";

const TILE_TONES: Record<IconTileTone, string> = {
  neutral: "bg-surface-2 text-foreground",
  primary:
    "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-400",
  pink: "bg-secondary-100 text-secondary-600 dark:bg-secondary-900 dark:text-secondary-400",
  danger:
    "bg-danger-100 text-danger-600 dark:bg-danger-900 dark:text-danger-400",
};

export interface IconTileProps {
  children: ReactNode;
  tone?: IconTileTone;
  /** Square size in pixels. Default 40; the icon takes half of it. */
  size?: number;
  className?: string;
}

/** Rounded square holding an icon. Replaces the gradient icon tiles. */
export function IconTile({
  children,
  tone = "neutral",
  size = 40,
  className = "",
}: IconTileProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-control [&>svg]:size-1/2 ${TILE_TONES[tone]} ${className}`}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  /** Usually a small secondary Button. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-card border border-dashed border-border-2 px-5 py-7 text-center ${className}`}
    >
      <IconTile size={44} className="mb-1.5">
        {icon}
      </IconTile>
      <p className="text-body font-semibold text-foreground">{title}</p>
      {children && (
        <p className="text-meta text-foreground-muted">{children}</p>
      )}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );
}

export interface LoadingRegionProps {
  /** True while the data shown is the previous one and the new is on its way. */
  busy: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * The data part of a screen. While a filter or a day loads, the header and
 * controls stay put: only this area dims, under a small spinner.
 */
export function LoadingRegion({
  busy,
  children,
  className = "",
}: LoadingRegionProps) {
  return (
    <div aria-busy={busy || undefined} className={`relative ${className}`}>
      {busy && (
        <div className="pointer-events-none absolute inset-x-0 top-6 z-10 flex justify-center">
          <span className="flex size-9 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-card">
            <Spinner size={16} />
          </span>
        </div>
      )}
      <div
        className={`transition-opacity ${
          busy ? "pointer-events-none opacity-40" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
