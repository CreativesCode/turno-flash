import { Database } from "@/types/database.types";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { createBrowserClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

/**
 * Native storage for the session (P1-25): cookies in the iOS WebView may not
 * persist, and on Android a hard close can lose a just-refreshed token.
 */
const preferencesStorage = {
  getItem: async (key: string) => (await Preferences.get({ key })).value,
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  },
};

let nativeClient: SupabaseClient<Database> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    // One instance: several would each refresh the token on their own
    nativeClient ??= createSupabaseClient<Database>(url, anonKey, {
      auth: {
        storage: preferencesStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
    return nativeClient;
  }

  return createBrowserClient<Database>(url, anonKey);
}
