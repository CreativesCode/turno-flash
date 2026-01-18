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

  // Ref para el timeout de seguridad
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref para controlar si el componente está montado (previene actualizaciones en componentes desmontados)
  const isMountedRef = useRef(true);
  // Ref para evitar procesar el mismo evento de autenticación múltiples veces
  const processingRef = useRef<{ userId: string | null; event: string | null }>({
    userId: null,
    event: null,
  });

  const loadUserProfile = useCallback(
    async (authUser: User, abortSignal?: AbortSignal) => {
      try {
        // Verificar si la operación fue cancelada
        if (abortSignal?.aborted) return;

        const { data: userProfile, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        // Verificar de nuevo después de la llamada async
        if (abortSignal?.aborted || !isMountedRef.current) return;

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
        if (!isMountedRef.current) return;
        console.error("Error loading user profile:", err);
        setProfile(null);
      } finally {
        if (!isMountedRef.current) return;
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
    // Marcar como montado
    isMountedRef.current = true;
    
    // Crear AbortController para cancelar operaciones si el componente se desmonta
    const abortController = new AbortController();

    // Establecer un timeout de seguridad para evitar quedarse colgado indefinidamente
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.warn("Auth timeout reached - forcing loading to false");
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    // Función async para la inicialización
    const initAuth = async () => {
      try {
        // Verificar si fue cancelado
        if (abortController.signal.aborted) return;

        // Obtener sesión inicial
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // Verificar de nuevo después de la llamada async
        if (abortController.signal.aborted || !isMountedRef.current) return;

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
          processingRef.current = {
            userId: session.user.id,
            event: "INIT_SESSION",
          };
          await loadUserProfile(session.user, abortController.signal);
        } else {
          // Limpiar timeout y terminar loading
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setLoading(false);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
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
      
      // No procesar si el componente fue desmontado
      if (!isMountedRef.current) return;

      // Prevenir procesar el mismo evento para el mismo usuario múltiples veces
      const currentUserId = session?.user?.id ?? null;
      if (
        processingRef.current.userId === currentUserId &&
        processingRef.current.event === event
      ) {
        console.log("Skipping duplicate auth event:", event, currentUserId);
        return;
      }

      console.log("Auth state changed:", event);
      
      // Actualizar ref antes de procesar
      processingRef.current = {
        userId: currentUserId,
        event,
      };

      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserProfile(session.user, abortController.signal);
      } else {
        setProfile(null);
        setLoading(false);
        // Resetear ref cuando no hay sesión
        processingRef.current = { userId: null, event: null };
      }
    });

    return () => {
      // Marcar como desmontado PRIMERO
      isMountedRef.current = false;
      
      // Cancelar operaciones pendientes
      abortController.abort();
      
      // Limpiar suscripción
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
