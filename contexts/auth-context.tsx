"use client";

import { clearPersistedQueries } from "@/contexts/query-client-provider";
import { UserProfile } from "@/types/auth";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";
import { User, isAuthRetryableFetchError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
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

// Last user and profile that loaded, so the panel opens without signal (P2-01).
// The real session check runs again as soon as the network is back.
const OFFLINE_SESSION_KEY = "turnoflash:offline-session";
// Without signal, refreshing an expired token keeps getSession pending for
// half a minute or more: open with the saved session after this long.
const OFFLINE_FALLBACK_MS = 8000;

interface OfflineSession {
  user: User;
  profile: UserProfile;
}

function readOfflineSession(): OfflineSession | null {
  try {
    const saved = window.localStorage.getItem(OFFLINE_SESSION_KEY);
    return saved ? (JSON.parse(saved) as OfflineSession) : null;
  } catch {
    return null;
  }
}

function saveOfflineSession(session: OfflineSession) {
  try {
    window.localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Not critical: the panel just will not open without signal
  }
}

function clearOfflineSession() {
  try {
    window.localStorage.removeItem(OFFLINE_SESSION_KEY);
  } catch {
    // Nothing to remove
  }
  clearPersistedQueries();
}

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
  const queryClient = useQueryClient();

  /** Leaves nothing of this user on the device, saved or in memory. */
  const forgetUserData = useCallback(() => {
    queryClient.clear();
    clearOfflineSession();
  }, [queryClient]);

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

  /** Network failure before any profile loaded: open with the saved one, if it is this user's. */
  const fallBackToOfflineSession = useCallback((userId?: string) => {
    setConnectionError(true);
    if (hasProfileRef.current) return;
    const saved = readOfflineSession();
    if (!saved || (userId && saved.user.id !== userId)) return;
    hasProfileRef.current = true;
    setUser((current) => current ?? saved.user);
    setProfile(saved.profile);
    setLoading(false);
  }, []);

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
            // RLS also hides the profile of a member whose access was removed;
            // ask so the panel can say so instead of "Sin organización".
            const { data: revoked, error: revokedError } = await supabase.rpc(
              "my_access_revoked"
            );
            if (abortSignal?.aborted || !isMountedRef.current) return;
            if (revokedError) {
              fallBackToOfflineSession(authUser.id);
              return;
            }
            console.log("User profile not found (new user from invitation)");
            // Crear un perfil básico basado en la info del auth user
            setProfile({
              id: authUser.id,
              user_id: authUser.id,
              email: authUser.email || "",
              full_name: authUser.user_metadata?.full_name || "",
              role: "staff",
              organization_id: null,
              is_active: !revoked,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as UserProfile);
            hasProfileRef.current = true;
          } else {
            // Network or expired token: keep the profile we had and retry later.
            // Showing "Sin organización asignada" here would be a lie.
            fallBackToOfflineSession(authUser.id);
            return;
          }
        } else {
          hasProfileRef.current = true;
          setProfile(userProfile);
          saveOfflineSession({ user: authUser, profile: userProfile });
        }
        setConnectionError(false);
        setLoading(false);
      } catch {
        if (!isMountedRef.current) return;
        fallBackToOfflineSession(authUser.id);
      }
    },
    [supabase, fallBackToOfflineSession]
  );

  const restoreSession = useCallback(
    async (abortSignal?: AbortSignal) => {
      const fallback = setTimeout(() => {
        if (isMountedRef.current && !abortSignal?.aborted) fallBackToOfflineSession();
      }, OFFLINE_FALLBACK_MS);
      try {
        if (abortSignal?.aborted) return;

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession().finally(() => clearTimeout(fallback));

        if (abortSignal?.aborted || !isMountedRef.current) return;

        if (error) {
          // The token refresh could not reach the server. Supabase keeps the
          // stored session in that case, so wait and retry instead of
          // treating the owner as logged out.
          if (isAuthRetryableFetchError(error)) {
            fallBackToOfflineSession();
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
          // Also undoes an offline session whose refresh token is no longer valid
          if (hasProfileRef.current) {
            hasProfileRef.current = false;
            setUser(null);
            setProfile(null);
            forgetUserData();
          }
          setConnectionError(false);
          setLoading(false);
        }
      } catch {
        if (!isMountedRef.current) return;
        fallBackToOfflineSession();
      }
    },
    [supabase, loadUserProfile, fallBackToOfflineSession, forgetUserData]
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
        forgetUserData();
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
  }, [supabase, loadUserProfile, restoreSession, forgetUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    forgetUserData();
    hasProfileRef.current = false;
    setUser(null);
    setProfile(null);
    setConnectionError(false);
  }, [supabase, forgetUserData]);

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
