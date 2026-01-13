// Tipos para organizaciones

export type LicenseStatus =
  | "active"
  | "grace_period"
  | "expired"
  | "no_license";

export interface Organization {
  id: string;
  name: string;
  timezone: string;
  slug: string;
  whatsapp_phone: string | null;
  license_start_date: string | null;
  license_end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OrganizationWithLicenseStatus extends Organization {
  license_status: LicenseStatus;
  days_remaining: number | null;
  is_usable: boolean;
  license_message: string;
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
