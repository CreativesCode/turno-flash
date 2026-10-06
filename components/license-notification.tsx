"use client";

import { LicenseStatusResult } from "@/types/organization";
import {
  formatLicenseMessage,
  getLicenseAlertType,
  getLicenseMessageTitle,
} from "@/utils/license";
import { SUPPORT_WHATSAPP_URL } from "@/config/constants";
import { X } from "lucide-react";
import { useState } from "react";

interface LicenseNotificationProps {
  licenseStatus: LicenseStatusResult;
  onClose?: () => void;
  dismissible?: boolean;
}

export function LicenseNotification({
  licenseStatus,
  onClose,
  dismissible = true,
}: LicenseNotificationProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const alertType = getLicenseAlertType(licenseStatus);
  const title = getLicenseMessageTitle(licenseStatus);
  const message = formatLicenseMessage(licenseStatus);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onClose) {
      onClose();
    }
  };

  if (isDismissed) {
    return null;
  }

  // No mostrar notificación si la licencia está activa y tiene más de 7 días
  if (
    licenseStatus.status === "active" &&
    licenseStatus.days_remaining !== null &&
    licenseStatus.days_remaining > 7
  ) {
    return null;
  }

  // No mostrar notificación si no hay licencia configurada (acceso ilimitado)
  if (licenseStatus.status === "no_license") {
    return null;
  }

  const getAlertStyles = () => {
    switch (alertType) {
      case "error":
        return {
          container:
            "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800",
          title: "text-red-800 dark:text-red-400",
          message: "text-red-700 dark:text-red-300",
          icon: "text-red-400 dark:text-red-600",
          button:
            "text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/20",
        };
      case "warning":
        return {
          container:
            "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800",
          title: "text-yellow-800 dark:text-yellow-400",
          message: "text-yellow-700 dark:text-yellow-300",
          icon: "text-yellow-400 dark:text-yellow-600",
          button:
            "text-yellow-500 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/20",
        };
      default:
        return {
          container:
            "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800",
          title: "text-blue-800 dark:text-blue-400",
          message: "text-blue-700 dark:text-blue-300",
          icon: "text-blue-400 dark:text-blue-600",
          button:
            "text-blue-500 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/20",
        };
    }
  };

  const styles = getAlertStyles();

  return (
    <div className={`rounded-lg border p-4 ${styles.container}`} role="alert">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`text-sm font-semibold ${styles.title}`}>{title}</h3>
          <p className={`mt-1 text-sm ${styles.message}`}>{message}</p>

          {licenseStatus.organization_name && (
            <p className={`mt-2 text-xs ${styles.message} opacity-75`}>
              Organización: {licenseStatus.organization_name}
            </p>
          )}

          {/* Información adicional según el estado */}
          {licenseStatus.status === "grace_period" && (
            <div className={`mt-3 text-xs ${styles.message}`}>
              <p className="font-medium">
                ⚠️ Estás en período de gracia. Puedes continuar usando la
                aplicación, pero debes renovar tu licencia pronto.
              </p>
              <SupportLine />
              {licenseStatus.days_remaining !== null && (
                <p className="mt-1">
                  Quedan {licenseStatus.days_remaining} día(s) de acceso antes
                  del bloqueo.
                </p>
              )}
            </div>
          )}

          {licenseStatus.status === "expired" && (
            <div className={`mt-3 text-xs ${styles.message}`}>
              <p className="font-medium">
                🚫 Tu licencia ha expirado.
              </p>
              <SupportLine />
            </div>
          )}

          {licenseStatus.status === "active" &&
            licenseStatus.days_remaining !== null &&
            licenseStatus.days_remaining <= 7 && (
              <div className={`mt-3 text-xs ${styles.message}`}>
                <p className="font-medium">
                  Tu licencia expirará pronto. Te recomendamos renovarla para
                  evitar interrupciones.
                </p>
                <SupportLine />
              </div>
            )}
        </div>

        {dismissible && licenseStatus.status !== "expired" && (
          <button
            onClick={handleDismiss}
            className={`ml-4 inline-flex rounded-md p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.button}`}
            aria-label="Cerrar notificación"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

function SupportLine() {
  return (
    <p className="mt-1">
      Para renovarla,{" "}
      <a
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline"
      >
        escríbenos por WhatsApp
      </a>
      .
    </p>
  );
}

/**
 * Componente compacto para mostrar en la barra superior
 */
export function LicenseNotificationBanner({
  licenseStatus,
}: {
  licenseStatus: LicenseStatusResult;
}) {
  const alertType = getLicenseAlertType(licenseStatus);

  // No mostrar banner si la licencia está OK
  if (
    licenseStatus.status === "active" &&
    licenseStatus.days_remaining !== null &&
    licenseStatus.days_remaining > 7
  ) {
    return null;
  }

  if (licenseStatus.status === "no_license") {
    return null;
  }

  const getBannerStyles = () => {
    switch (alertType) {
      case "error":
        return "bg-red-600 text-white";
      case "warning":
        return "bg-yellow-500 text-black";
      default:
        return "bg-blue-600 text-white";
    }
  };

  const getMessage = () => {
    if (licenseStatus.status === "expired") {
      return "🚫 Licencia expirada - Escríbenos por WhatsApp para renovarla";
    }

    if (licenseStatus.status === "grace_period") {
      return `⚠️ Licencia vencida - ${
        licenseStatus.days_remaining || 0
      } días de gracia restantes`;
    }

    if (
      licenseStatus.status === "active" &&
      licenseStatus.days_remaining !== null
    ) {
      return `⚠️ Tu licencia expira en ${licenseStatus.days_remaining} día(s)`;
    }

    return licenseStatus.message;
  };

  return (
    <div
      className={`${getBannerStyles()} px-4 py-2 text-center text-sm font-medium`}
    >
      {getMessage()}
    </div>
  );
}
