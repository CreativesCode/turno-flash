import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Static export para SPA
  images: {
    unoptimized: true, // Requerido para static export
  },
  trailingSlash: true, // Opcional, para compatibilidad
};

export default nextConfig;
