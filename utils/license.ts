// Utilidades para gestión de licencias

import { createClient } from "@/utils/supabase/client";
import { LicenseStatusResult } from "@/types/organization";

/**
 * Obtiene el período de gracia configurado en días
 * Por defecto es 7 días si no está configurado
 */
export function getGracePeriodDays(): number {
  const gracePeriod = process.env.NEXT_PUBLIC_LICENSE_GRACE_PERIOD_DAYS;
  return gracePeriod ? parseInt(gracePeriod, 10) : 7;
}

/**
 * Obtiene el estado de la licencia de la organización del usuario actual
 * Utiliza la función de base de datos get_my_organization_license_status
 */
export async function getMyOrganizationLicenseStatus(): Promise<LicenseStatusResult | null> {
  const supabase = createClient();
  const gracePeriodDays = getGracePeriodDays();

  try {
    const { data, error } = await supabase.rpc(
      'get_my_organization_license_status',
      { grace_period_days: gracePeriodDays }
    );

    if (error) {
      console.error('Error fetching license status:', error);
      return null;
    }

    // La función RPC retorna un array con un solo elemento
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as LicenseStatusResult;
    }

    return null;
  } catch (err) {
    console.error('Exception fetching license status:', err);
    return null;
  }
}

/**
 * Verifica si la organización puede usar la aplicación
 * @param licenseStatus Estado de la licencia obtenido de getMyOrganizationLicenseStatus
 * @returns true si puede usar la app, false si está bloqueada
 */
export function canUseApplication(licenseStatus: LicenseStatusResult | null): boolean {
  if (!licenseStatus) {
    // Si no se pudo obtener el estado, permitir acceso por defecto
    return true;
  }

  return licenseStatus.is_usable;
}

/**
 * Determina si se debe mostrar una notificación de licencia
 * @param licenseStatus Estado de la licencia
 * @returns true si debe mostrar notificación
 */
export function shouldShowLicenseNotification(licenseStatus: LicenseStatusResult | null): boolean {
  if (!licenseStatus) {
    return false;
  }

  // Mostrar notificación si:
  // 1. Está en período de gracia
  // 2. Está activa pero le quedan menos de 7 días
  // 3. Está expirada
  const { status, days_remaining } = licenseStatus;

  if (status === 'grace_period' || status === 'expired') {
    return true;
  }

  if (status === 'active' && days_remaining !== null && days_remaining <= 7) {
    return true;
  }

  return false;
}

/**
 * Obtiene el tipo de alerta según el estado de la licencia
 * @param licenseStatus Estado de la licencia
 * @returns 'error' | 'warning' | 'info'
 */
export function getLicenseAlertType(
  licenseStatus: LicenseStatusResult | null
): 'error' | 'warning' | 'info' {
  if (!licenseStatus) {
    return 'info';
  }

  const { status, days_remaining } = licenseStatus;

  if (status === 'expired') {
    return 'error';
  }

  if (status === 'grace_period') {
    return 'error';
  }

  if (status === 'active' && days_remaining !== null && days_remaining <= 3) {
    return 'error';
  }

  if (status === 'active' && days_remaining !== null && days_remaining <= 7) {
    return 'warning';
  }

  return 'info';
}

/**
 * Formatea el mensaje de estado de licencia para mostrar al usuario
 * @param licenseStatus Estado de la licencia
 * @returns Mensaje formateado
 */
export function formatLicenseMessage(licenseStatus: LicenseStatusResult | null): string {
  if (!licenseStatus) {
    return 'No se pudo verificar el estado de la licencia';
  }

  return licenseStatus.message;
}

/**
 * Obtiene el título del mensaje según el estado de la licencia
 * @param licenseStatus Estado de la licencia
 * @returns Título del mensaje
 */
export function getLicenseMessageTitle(licenseStatus: LicenseStatusResult | null): string {
  if (!licenseStatus) {
    return 'Estado de licencia';
  }

  const { status } = licenseStatus;

  switch (status) {
    case 'active':
      return 'Licencia activa';
    case 'grace_period':
      return '⚠️ Licencia vencida - Período de gracia';
    case 'expired':
      return '🚫 Licencia expirada';
    case 'no_license':
      return 'Sin licencia configurada';
    default:
      return 'Estado de licencia';
  }
}
