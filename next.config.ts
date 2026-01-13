import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // ✅ NECESARIO para Capacitor (genera /out)
  images: {
    unoptimized: true, // Requerido para static export
  },
  // NOTA: Con static export, NO podemos usar middleware ni route handlers.
  // La autenticación es 100% client-side (React).
  // La protección REAL está en RLS de Supabase (server-side en la DB).
  // Ver docs/CORRECCION-capacitor.md para más información.
};

export default nextConfig;
