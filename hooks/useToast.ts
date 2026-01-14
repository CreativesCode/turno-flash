import { toast as sonnerToast } from "sonner";

/**
 * Hook personalizado para mostrar notificaciones toast
 * 
 * Proporciona una API consistente y en español para mostrar
 * notificaciones de éxito, error, información y carga.
 * 
 * @example
 * ```tsx
 * const toast = useToast();
 * 
 * toast.success("Turno creado exitosamente");
 * toast.error("Error al crear turno");
 * toast.info("Información importante");
 * toast.loading("Guardando...");
 * ```
 */
export function useToast() {
  return {
    /**
     * Muestra una notificación de éxito
     */
    success: (message: string, description?: string) => {
      return sonnerToast.success(message, {
        description,
        duration: 4000,
      });
    },

    /**
     * Muestra una notificación de error
     */
    error: (message: string, description?: string) => {
      return sonnerToast.error(message, {
        description,
        duration: 5000,
      });
    },

    /**
     * Muestra una notificación de información
     */
    info: (message: string, description?: string) => {
      return sonnerToast.info(message, {
        description,
        duration: 4000,
      });
    },

    /**
     * Muestra una notificación de advertencia
     */
    warning: (message: string, description?: string) => {
      return sonnerToast.warning(message, {
        description,
        duration: 4000,
      });
    },

    /**
     * Muestra una notificación de carga
     * Retorna una función para actualizar o cerrar el toast
     */
    loading: (message: string) => {
      return sonnerToast.loading(message);
    },

    /**
     * Muestra una notificación de validación con detalles del error
     * Útil para errores de Zod que incluyen el campo específico
     */
    validationError: (errorMessage: string) => {
      // Extraer el campo del mensaje si está presente
      const fieldMatch = errorMessage.match(/\(campo: (.+)\)/);
      const field = fieldMatch ? fieldMatch[1] : undefined;
      const message = errorMessage.replace(/ \(campo: .+\)$/, "");

      return sonnerToast.error("Error de validación", {
        description: field ? `${message}\nCampo: ${field}` : message,
        duration: 5000,
      });
    },

    /**
     * Cierra un toast específico
     */
    dismiss: (toastId: string | number) => {
      sonnerToast.dismiss(toastId);
    },

    /**
     * Cierra todos los toasts
     */
    dismissAll: () => {
      sonnerToast.dismiss();
    },
  };
}

/**
 * Exportación directa para usar sin hook (en funciones no-React)
 * 
 * @example
 * ```tsx
 * import { toast } from '@/hooks/useToast';
 * 
 * toast.success("Operación exitosa");
 * ```
 */
export const toast = {
  success: (message: string, description?: string) =>
    sonnerToast.success(message, { description, duration: 4000 }),
  error: (message: string, description?: string) =>
    sonnerToast.error(message, { description, duration: 5000 }),
  info: (message: string, description?: string) =>
    sonnerToast.info(message, { description, duration: 4000 }),
  warning: (message: string, description?: string) =>
    sonnerToast.warning(message, { description, duration: 4000 }),
  loading: (message: string) => sonnerToast.loading(message),
  validationError: (errorMessage: string) => {
    const fieldMatch = errorMessage.match(/\(campo: (.+)\)/);
    const field = fieldMatch ? fieldMatch[1] : undefined;
    const message = errorMessage.replace(/ \(campo: .+\)$/, "");

    return sonnerToast.error("Error de validación", {
      description: field ? `${message}\nCampo: ${field}` : message,
      duration: 5000,
    });
  },
  dismiss: (toastId: string | number) => sonnerToast.dismiss(toastId),
  dismissAll: () => sonnerToast.dismiss(),
};
