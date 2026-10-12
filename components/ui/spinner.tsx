export interface SpinnerProps {
  /** Diameter in pixels. Default 20. */
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className = "" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
