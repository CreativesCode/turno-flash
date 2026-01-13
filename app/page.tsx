"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function Home() {
  const router = useRouter();
  const hasRedirected = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    // Evitar múltiples ejecuciones
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    const handleRedirect = async () => {
      // Si hay tokens de autenticación en el hash, redirigir al callback INMEDIATAMENTE
      // Sin consultar la sesión para evitar conflictos
      if (window.location.hash.includes("access_token")) {
        const hash = window.location.hash;
        window.location.href = `/auth/callback${hash}`;
        return;
      }

      // Solo si no hay tokens, verificar sesión existente
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error checking session:", error);
        router.replace("/login");
      }
    };

    handleRedirect();
  }, [router, supabase.auth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="text-zinc-600 dark:text-zinc-400">Cargando...</div>
    </div>
  );
}
