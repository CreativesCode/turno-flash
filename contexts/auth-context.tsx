"use client";

import { UserProfile } from "@/types/auth";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Timeout máximo para la verificación inicial de autenticación (10 segundos)
const AUTH_TIMEOUT_MS = 10000;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider de autenticación global
 * Wrap your app with this provider to access auth state anywhere
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoizar el cliente de Supabase para evitar crear una nueva instancia en cada render
  const supabase = useMemo(() => createClient(), []);

  // Ref para evitar inicialización múltiple
  const isInitialized = useRef(false);
  // Ref para el timeout de seguridad
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadUserProfile = useCallback(
    async (authUser: User) => {
      try {
        const { data: userProfile, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        if (error) {
          // PGRST116 significa que no se encontró ninguna fila (usuario nuevo sin perfil)
          // Esto es normal para usuarios que vienen de una invitación por primera vez
          if (error.code === "PGRST116") {
            console.log("User profile not found (new user from invitation)");
            // Crear un perfil básico basado en la info del auth user
            setProfile({
              id: authUser.id,
              user_id: authUser.id,
              email: authUser.email || "",
              full_name: authUser.user_metadata?.full_name || "",
              role: "staff",
              organization_id: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as UserProfile);
          } else {
            console.error("Error loading user profile:", error);
            setProfile(null);
          }
        } else {
          setProfile(userProfile);
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
        setProfile(null);
      } finally {
        // Limpiar timeout si existe
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Evitar inicialización múltiple (React Strict Mode ejecuta efectos dos veces)
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Establecer un timeout de seguridad para evitar quedarse colgado indefinidamente
    timeoutRef.current = setTimeout(() => {
      console.warn("Auth timeout reached - forcing loading to false");
      setLoading(false);
    }, AUTH_TIMEOUT_MS);

    // Función async para la inicialización
    const initAuth = async () => {
      try {
        // Obtener sesión inicial
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          // Limpiar timeout y terminar loading
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          await loadUserProfile(session.user);
        } else {
          // Limpiar timeout y terminar loading
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error in auth initialization:", err);
        // Limpiar timeout y terminar loading en caso de error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setLoading(false);
      }
    };

    initAuth();

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignorar el evento INITIAL_SESSION ya que lo manejamos manualmente arriba
      if (event === "INITIAL_SESSION") return;

      console.log("Auth state changed:", event);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      // Limpiar timeout al desmontar
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [supabase, loadUserProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await loadUserProfile(user);
    }
  }, [supabase, loadUserProfile]);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      profile,
      loading,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para acceder al contexto de autenticación
 * Debe usarse dentro de un componente envuelto por AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
