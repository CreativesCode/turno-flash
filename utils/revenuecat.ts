// Utilidades para suscripciones con RevenueCat (Google Play / App Store)
//
// Arquitectura (ver docs/PLAN-GOOGLE-PLAY.md §2):
// - El app_user_id de RevenueCat es el organization_id: la suscripción
//   pertenece a la organización, igual que la licencia existente.
// - El entitlement "pro" activo extiende organizations.license_end_date
//   vía webhook (Edge Function revenuecat-webhook). El cliente solo lee
//   CustomerInfo para UX inmediata; la fuente de verdad es el webhook.

import { Logger } from "@/utils/logger";
import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "@revenuecat/purchases-capacitor";

/** Entitlement configurado en RevenueCat que habilita la app */
export const PRO_ENTITLEMENT_ID = "pro";

let configuredForOrgId: string | null = null;

function getApiKey(): string | null {
  const platform = Capacitor.getPlatform();
  if (platform === "android") {
    return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? null;
  }
  if (platform === "ios") {
    return process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY ?? null;
  }
  return null;
}

/**
 * Indica si las compras in-app están disponibles en esta plataforma.
 * Solo en app nativa (Capacitor) y con API key configurada.
 */
export function isPurchasesAvailable(): boolean {
  return Capacitor.isNativePlatform() && getApiKey() !== null;
}

/**
 * Configura RevenueCat para la organización dada.
 * Idempotente: si ya está configurado para la misma organización, no hace nada.
 */
export async function initRevenueCat(organizationId: string): Promise<boolean> {
  if (!isPurchasesAvailable()) return false;
  if (configuredForOrgId === organizationId) return true;

  try {
    if (process.env.NODE_ENV !== "production") {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }

    await Purchases.configure({
      apiKey: getApiKey()!,
      appUserID: organizationId,
    });

    configuredForOrgId = organizationId;
    return true;
  } catch (err) {
    void Logger.error("Error configurando RevenueCat", err, {
      util: "revenuecat",
      organizationId,
    });
    return false;
  }
}

/**
 * Obtiene la oferta actual (offering "default" en RevenueCat) con sus packages.
 */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (err) {
    void Logger.error("Error obteniendo offerings de RevenueCat", err, {
      util: "revenuecat",
    });
    return null;
  }
}

/**
 * Obtiene la información del cliente (suscripciones/entitlements actuales).
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (err) {
    void Logger.error("Error obteniendo CustomerInfo de RevenueCat", err, {
      util: "revenuecat",
    });
    return null;
  }
}

export interface PurchaseResult {
  success: boolean;
  cancelled: boolean;
  customerInfo: CustomerInfo | null;
  error?: string;
}

/**
 * Inicia el flujo de compra de Google Play para un package.
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: pkg,
    });
    return { success: true, cancelled: false, customerInfo };
  } catch (err) {
    // Cancelación del usuario: no es un error a reportar
    const code = (err as { code?: string })?.code;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, cancelled: true, customerInfo: null };
    }

    void Logger.error("Error en compra de suscripción", err, {
      util: "revenuecat",
      packageId: pkg.identifier,
    });
    return {
      success: false,
      cancelled: false,
      customerInfo: null,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

/**
 * Restaura compras previas (p. ej. reinstalación o cambio de dispositivo).
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo;
  } catch (err) {
    void Logger.error("Error restaurando compras", err, {
      util: "revenuecat",
    });
    return null;
  }
}

/**
 * Verifica si el entitlement "pro" está activo en el CustomerInfo dado.
 */
export function hasProEntitlement(
  customerInfo: CustomerInfo | null
): boolean {
  if (!customerInfo) return false;
  return PRO_ENTITLEMENT_ID in customerInfo.entitlements.active;
}

/**
 * Fecha de expiración del entitlement "pro" (ISO string) o null.
 */
export function getProExpirationDate(
  customerInfo: CustomerInfo | null
): string | null {
  if (!customerInfo) return null;
  return (
    customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]?.expirationDate ??
    null
  );
}
