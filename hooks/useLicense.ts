// Hook personalizado para gestión de licencias

import { useState, useEffect } from "react";
import { LicenseStatusResult } from "@/types/organization";
import {
  getMyOrganizationLicenseStatus,
  canUseApplication,
  shouldShowLicenseNotification,
  getLicenseAlertType,
  getLicenseMessageTitle,
  formatLicenseMessage,
} from "@/utils/license";
import { useAuth } from "@/contexts/auth-context";

export function useLicense() {
  const { profile } = useAuth();
  const [licenseStatus, setLicenseStatus] =
    useState<LicenseStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Flag para controlar si el componente sigue montado
    let isMounted = true;

    const loadLicenseStatus = async () => {
      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }

        // Solo verificar licencia si el usuario tiene una organización
        // Los admins sin organización no necesitan verificar licencia
        if (!profile?.organization_id && profile?.role !== "admin") {
          if (isMounted) setLoading(false);
          return;
        }

        const status = await getMyOrganizationLicenseStatus();
        
        // Verificar si el componente sigue montado antes de actualizar estado
        if (isMounted) {
          setLicenseStatus(status);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading license status:", err);
        setError(
          err instanceof Error ? err.message : "Error al cargar estado de licencia"
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (profile) {
      loadLicenseStatus();
    }

    // Cleanup: marcar como desmontado para evitar actualizaciones de estado
    return () => {
      isMounted = false;
    };
  }, [profile]);

  return {
    licenseStatus,
    loading,
    error,
    // Funciones de utilidad
    canUse: canUseApplication(licenseStatus),
    shouldShowNotification: shouldShowLicenseNotification(licenseStatus),
    alertType: getLicenseAlertType(licenseStatus),
    title: getLicenseMessageTitle(licenseStatus),
    message: formatLicenseMessage(licenseStatus),
    // Información adicional
    isBlocked: licenseStatus ? !canUseApplication(licenseStatus) : false,
    isInGracePeriod: licenseStatus?.status === "grace_period",
    isExpired: licenseStatus?.status === "expired",
    isActive: licenseStatus?.status === "active",
    hasNoLicense: licenseStatus?.status === "no_license",
    daysRemaining: licenseStatus?.days_remaining || null,
  };
}
