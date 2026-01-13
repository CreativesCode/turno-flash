"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

interface MobileNavbarProps {
  isOpen: boolean;
  onToggle: () => void;
  title?: string;
}

/**
 * Navbar móvil que respeta el safe area de la barra de estado
 * Se muestra solo en móvil y se oculta en desktop
 */
export function MobileNavbar({ isOpen, onToggle, title }: MobileNavbarProps) {
  const [safeAreaTop, setSafeAreaTop] = useState(0);

  useEffect(() => {
    // Detectar el safe area top
    const updateSafeArea = () => {
      // Obtener el valor de CSS variable si está disponible
      const root = document.documentElement;
      const computed = getComputedStyle(root);
      const safeTop = computed
        .getPropertyValue("--safe-area-inset-top")
        .trim();

      if (safeTop && safeTop !== "0px") {
        setSafeAreaTop(parseInt(safeTop) || 0);
      } else {
        // Fallback: detectar si hay notch
        setSafeAreaTop(0);
      }
    };

    updateSafeArea();
    window.addEventListener("resize", updateSafeArea);

    return () => window.removeEventListener("resize", updateSafeArea);
  }, []);

  return (
    <nav
      className="fixed left-0 right-0 top-0 z-50 bg-surface shadow-md lg:hidden"
      style={{
        paddingTop: `max(${safeAreaTop}px, env(safe-area-inset-top, 0px))`,
      }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {/* Menu button */}
        <button
          onClick={onToggle}
          className="rounded-md p-2 transition-colors hover:bg-muted"
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Title/Logo */}
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-info">
            {title || "🗓️ TurnoFlash"}
          </h1>
        </div>

        {/* Spacer para balance */}
        <div className="w-10" />
      </div>
    </nav>
  );
}
