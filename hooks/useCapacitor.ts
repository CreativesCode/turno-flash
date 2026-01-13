"use client";

import { useTheme } from "@/contexts/theme-context";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect, useState } from "react";

/**
 * Hook para detectar si estamos corriendo en Capacitor y manejar la barra de estado
 */
export function useCapacitor() {
  const [isNative, setIsNative] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Detectar si estamos en Capacitor
    const native = Capacitor.isNativePlatform();
    setIsNative(native);

    // Detectar si es móvil (width < 1024px)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Configurar la barra de estado solo en plataformas nativas
    if (isNative) {
      const setupStatusBar = async () => {
        try {
          // Hacer la barra de estado visible
          await StatusBar.show();

          // Cambiar el estilo según el tema
          if (theme === "dark") {
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: "#1a1a1a" });
          } else {
            await StatusBar.setStyle({ style: Style.Light });
            await StatusBar.setBackgroundColor({ color: "#ffffff" });
          }
        } catch (error) {
          console.error("Error configurando la barra de estado:", error);
        }
      };

      setupStatusBar();
    }
  }, [isNative, theme]);

  return {
    isNative,
    isMobile,
    platform: Capacitor.getPlatform(),
  };
}
