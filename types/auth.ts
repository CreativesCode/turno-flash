// Tipos para autenticación y roles de usuario

export type UserRole = "admin" | "owner" | "staff" | "special";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  organization_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}

// Helper types para permisos
export type Permission =
  | "manage_users"
  | "manage_organization"
  | "manage_services"
  | "manage_bookings"
  | "view_bookings"
  | "manage_settings";

// Mapeo de roles a permisos
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "manage_users",
    "manage_organization",
    "manage_services",
    "manage_bookings",
    "view_bookings",
    "manage_settings",
  ],
  owner: [
    "manage_organization",
    "manage_services",
    "manage_bookings",
    "view_bookings",
    "manage_settings",
  ],
  staff: [
    "view_bookings",
    "manage_bookings", // Pueden gestionar bookings pero no crear/eliminar servicios
  ],
  special: [
    // Permisos personalizados según necesidad
    "view_bookings",
    "manage_bookings",
  ],
};
