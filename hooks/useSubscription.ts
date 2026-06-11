// Hook para gestión de la suscripción de la organización vía RevenueCat
//
// Solo opera en plataforma nativa (Capacitor). En web expone
// isAvailable=false para que la UI muestre el aviso correspondiente.

import { useCallback, useEffect, useState } from "react";
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "@revenuecat/purchases-capacitor";
import { useAuth } from "@/contexts/auth-context";
import { Logger } from "@/utils/logger";
import {
  getCurrentOffering,
  getCustomerInfo,
  getProExpirationDate,
  hasProEntitlement,
  initRevenueCat,
  isPurchasesAvailable,
  purchasePackage,
  restorePurchases,
  type PurchaseResult,
} from "@/utils/revenuecat";

export function useSubscription() {
  const { profile } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const organizationId = profile?.organization_id ?? null;

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      // isPurchasesAvailable usa Capacitor: evaluarlo en efecto (cliente)
      if (!organizationId || !isPurchasesAvailable()) {
        if (isMounted) {
          setIsAvailable(false);
          setLoading(false);
        }
        return;
      }

      try {
        const configured = await initRevenueCat(organizationId);
        if (!configured) {
          if (isMounted) {
            setIsAvailable(false);
            setLoading(false);
          }
          return;
        }

        const [currentOffering, info] = await Promise.all([
          getCurrentOffering(),
          getCustomerInfo(),
        ]);

        if (isMounted) {
          setIsAvailable(true);
          setOffering(currentOffering);
          setCustomerInfo(info);
        }
      } catch (err) {
        if (!isMounted) return;
        void Logger.error("Error inicializando suscripciones", err, {
          hook: "useSubscription",
        });
        setError(
          err instanceof Error ? err.message : "Error al cargar suscripciones"
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const purchase = useCallback(
    async (pkg: PurchasesPackage): Promise<PurchaseResult> => {
      setPurchasing(true);
      setError(null);
      try {
        const result = await purchasePackage(pkg);
        if (result.success && result.customerInfo) {
          setCustomerInfo(result.customerInfo);
        } else if (!result.cancelled && result.error) {
          setError(result.error);
        }
        return result;
      } finally {
        setPurchasing(false);
      }
    },
    []
  );

  const restore = useCallback(async (): Promise<boolean> => {
    setPurchasing(true);
    setError(null);
    try {
      const info = await restorePurchases();
      if (info) {
        setCustomerInfo(info);
        return hasProEntitlement(info);
      }
      return false;
    } finally {
      setPurchasing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const info = await getCustomerInfo();
    if (info) setCustomerInfo(info);
  }, []);

  return {
    /** true solo en app nativa con API key configurada */
    isAvailable,
    loading,
    purchasing,
    error,
    offering,
    packages: offering?.availablePackages ?? [],
    customerInfo,
    isPro: hasProEntitlement(customerInfo),
    proExpirationDate: getProExpirationDate(customerInfo),
    // Acciones
    purchase,
    restore,
    refresh,
  };
}
