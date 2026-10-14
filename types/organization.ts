// Tipos para organizaciones
import type { UserProfile } from "./auth";
import { Database } from "./database.types";

// Tipos generados desde Supabase
export type LicenseStatus = Database["public"]["Enums"]["license_status"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];

// The organizations_with_license_status view does not expose reply_prefix (083).
export interface OrganizationWithLicenseStatus
  extends Omit<Organization, "reply_prefix"> {
  license_status: LicenseStatus;
  days_remaining: number | null;
  is_usable: boolean;
  license_message: string;
}

export interface OrganizationWithOwner extends OrganizationWithLicenseStatus {
  owner?: UserProfile | null;
  member_count?: number;
}

export interface CreateOrganizationParams {
  org_name: string;
  org_slug: string;
  org_timezone?: string;
  org_whatsapp_phone?: string;
  owner_user_id?: string;
  owner_email?: string;
  license_start_date?: string;
  license_end_date?: string;
}

export interface CreateOrganizationResult {
  organization_id: string;
  user_id: string;
  success: boolean;
}

export interface LicenseStatusResult {
  organization_id: string | null;
  organization_name: string;
  status: LicenseStatus;
  days_remaining: number | null;
  is_usable: boolean;
  message: string;
}
