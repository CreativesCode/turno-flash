import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

const ASPECT_RATIO = 20.49 / 20;

export function Logo({ size = 36, className, priority = false }: LogoProps) {
  const width = Math.round(size * ASPECT_RATIO);
  return (
    <Image
      src="/images/isotipo.svg"
      alt="TurnoFlash"
      width={width}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
