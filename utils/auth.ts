// Utilidades para autenticación y verificación de permisos

import { Permission, ROLE_PERMISSIONS, UserRole } from "@/types/auth";
import { createClient } from "./supabase/client";

/**
 * Verifica si un rol tiene un permiso específico
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Verifica si un rol es admin u owner
 */
export function isAdminOrOwner(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "owner";
}

/**
 * Verifica si un rol es admin
 */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

/**
 * Obtiene el perfil del usuario actual desde Supabase
 */
export async function getCurrentUserProfile() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    ...user,
    profile,
  };
}

/**
 * Verifica si el usuario actual tiene un permiso específico
 */
export async function checkPermission(
  permission: Permission
): Promise<boolean> {
  const userData = await getCurrentUserProfile();

  if (!userData?.profile) {
    return false;
  }

  if (!userData.profile.is_active) {
    return false;
  }

  return hasPermission(userData.profile.role, permission);
}
