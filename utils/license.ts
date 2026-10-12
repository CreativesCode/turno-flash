// Utilidades para gestión de licencias

import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";
import { LicenseStatusResult } from "@/types/organization";
import {
  LICENSE_GRACE_DAYS,
  LICENSE_NOTICE_DAYS_BEFORE,
} from "@/config/license-pricing";

/**
 * Días de margen tras el vencimiento. Es fijo: la base de datos usa el mismo
 * valor en license_grace_days() (migración 073), y ahí se decide el bloqueo.
 */
export function getGracePeriodDays(): number {
  return LICENSE_GRACE_DAYS;
}

/**
 * The owner is warned from 2 days before the license ends (same calendar as
 * the WhatsApp notices). `days_remaining` is rounded up, so with 2 full days
 * left it reads 3.
 */
export function isLicenseExpiringSoon(
  licenseStatus: LicenseStatusResult | null
): boolean {
  return (
    licenseStatus?.status === "active" &&
    licenseStatus.days_remaining !== null &&
    licenseStatus.days_remaining <= LICENSE_NOTICE_DAYS_BEFORE + 1
  );
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
      void Logger.error("Error fetching license status", error, {
        rpc: "get_my_organization_license_status",
      });
      return null;
    }

    // La función RPC retorna un array con un solo elemento
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as LicenseStatusResult;
    }

    return null;
  } catch (err) {
    void Logger.error("Exception fetching license status", err, {
      rpc: "get_my_organization_license_status",
    });
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
  // 1. Está en los días de margen
  // 2. Está activa pero vence en 2 días o menos
  // 3. Está bloqueada
  const { status } = licenseStatus;

  if (status === 'grace_period' || status === 'expired') {
    return true;
  }

  return isLicenseExpiringSoon(licenseStatus);
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

  const { status } = licenseStatus;

  if (status === 'expired') {
    return 'error';
  }

  if (status === 'grace_period') {
    return 'error';
  }

  if (isLicenseExpiringSoon(licenseStatus)) {
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
      return 'Tu acceso está por vencer';
    case 'grace_period':
      return '⚠️ Tu acceso venció: estás en los días de margen';
    case 'expired':
      return '🚫 Acceso bloqueado';
    case 'no_license':
      return 'Sin licencia configurada';
    default:
      return 'Estado de licencia';
  }
}
