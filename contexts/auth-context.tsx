"use client";

import { UserProfile } from "@/types/auth";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";
import { User, isAuthRetryableFetchError } from "@supabase/supabase-js";
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

// While the session or profile can't be loaded for network reasons, retry this often.
// Cuban networks often stay "online" without reaching the server, so the
// browser's `online` event alone is not enough.
const CONNECTION_RETRY_MS = 10000;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  /** The session or profile could not be checked because of the network. */
  connectionError: boolean;
  /** Try again to restore the session and load the profile. */
  retry: () => Promise<void>;
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
  const [connectionError, setConnectionError] = useState(false);

  // Memoizar el cliente de Supabase para evitar crear una nueva instancia en cada render
  const supabase = useMemo(() => createClient(), []);

  // A network failure must never wipe a profile that already loaded
  const hasProfileRef = useRef(false);
  // Avoid piling up retries when a request takes longer than the retry interval
  const restoringRef = useRef(false);
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
            hasProfileRef.current = true;
          } else {
            // Network or expired token: keep the profile we had and retry later.
            // Showing "Sin organización asignada" here would be a lie.
            if (!hasProfileRef.current) setConnectionError(true);
            return;
          }
        } else {
          hasProfileRef.current = true;
          setProfile(userProfile);
        }
        setConnectionError(false);
        setLoading(false);
      } catch {
        if (!isMountedRef.current) return;
        if (!hasProfileRef.current) setConnectionError(true);
      }
    },
    [supabase]
  );

  const restoreSession = useCallback(
    async (abortSignal?: AbortSignal) => {
      try {
        if (abortSignal?.aborted) return;

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (abortSignal?.aborted || !isMountedRef.current) return;

        if (error) {
          // The token refresh could not reach the server. Supabase keeps the
          // stored session in that case, so wait and retry instead of
          // treating the owner as logged out.
          if (isAuthRetryableFetchError(error)) {
            setConnectionError(true);
            return;
          }
          void Logger.error("Error getting session", error, {
            context: "auth-context.restoreSession",
          });
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          processingRef.current = {
            userId: session.user.id,
            event: "INIT_SESSION",
          };
          await loadUserProfile(session.user, abortSignal);
        } else {
          setConnectionError(false);
          setLoading(false);
        }
      } catch {
        if (!isMountedRef.current) return;
        setConnectionError(true);
      }
    },
    [supabase, loadUserProfile]
  );

  const retry = useCallback(async () => {
    if (restoringRef.current) return;
    restoringRef.current = true;
    try {
      await restoreSession();
    } finally {
      restoringRef.current = false;
    }
  }, [restoreSession]);

  // Keep retrying while the network is the only thing between the owner and the panel
  useEffect(() => {
    if (!connectionError) return;
    const tryAgain = () => void retry();
    const onVisible = () => {
      if (document.visibilityState === "visible") tryAgain();
    };
    const interval = setInterval(tryAgain, CONNECTION_RETRY_MS);
    window.addEventListener("online", tryAgain);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", tryAgain);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [connectionError, retry]);

  useEffect(() => {
    // Marcar como montado
    isMountedRef.current = true;
    
    // Crear AbortController para cancelar operaciones si el componente se desmonta
    const abortController = new AbortController();

    void restoreSession(abortController.signal);

    // Escuchar cambios en la autenticación
    // IMPORTANTE: este callback DEBE ser síncrono respecto a llamadas a Supabase.
    // Hacer `await` de cualquier método de supabase aquí (incluyendo queries de DB,
    // que internamente llaman a getAccessToken()) provoca un deadlock con el lock
    // de @supabase/ssr que mantiene setSession()/refreshToken() mientras dispara
    // este evento. Por eso diferimos loadUserProfile con setTimeout(_, 0).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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

      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        // Diferir la llamada para liberar el lock de auth de @supabase/ssr.
        setTimeout(() => {
          if (!isMountedRef.current) return;
          if (abortController.signal.aborted) return;
          void loadUserProfile(sessionUser, abortController.signal);
        }, 0);
      } else {
        hasProfileRef.current = false;
        setProfile(null);
        setConnectionError(false);
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
    };
  }, [supabase, loadUserProfile, restoreSession]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    hasProfileRef.current = false;
    setUser(null);
    setProfile(null);
    setConnectionError(false);
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
      connectionError,
      retry,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, connectionError, retry, signOut, refreshProfile]
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
