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
  useState,
} from "react";

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
  const supabase = createClient();

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
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
    };
  }, [supabase.auth, loadUserProfile]);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await loadUserProfile(user);
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  };

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
