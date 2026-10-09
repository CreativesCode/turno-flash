"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = "turno-flash-theme";

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  // Solo se guarda lo que el usuario elige: sin elección, la app sigue al
  // tema del sistema en cada visita.
  const userChose = useRef(false);

  // Cargar tema desde localStorage o preferencia del sistema
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(
        THEME_STORAGE_KEY
      ) as Theme | null;

      if (storedTheme && (storedTheme === "light" || storedTheme === "dark")) {
        setThemeState(storedTheme);
      } else {
        // Si no hay tema guardado, usar preferencia del sistema
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        setThemeState(prefersDark ? "dark" : "light");
      }
    } catch (error) {
      // Si hay error (ej: modo privado), usar preferencia del sistema
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setThemeState(prefersDark ? "dark" : "light");
    }

    setMounted(true);
  }, []);

  // Aplicar tema al elemento html
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (!userChose.current) return;

    // Guardar en localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // Ignorar errores de localStorage (ej: modo privado)
      console.warn("Failed to save theme to localStorage:", error);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    userChose.current = true;
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    userChose.current = true;
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const value: ThemeContextType = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de tema
 * Debe usarse dentro de un componente envuelto por ThemeProvider
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
