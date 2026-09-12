/**
 * Utilidades para generar URLs absolutas para metadata SEO
 * Necesario para WhatsApp y otras plataformas que requieren URLs absolutas
 */

const getBaseUrl = (): string => {
  // En producción, usar la variable de entorno o el dominio real
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // En desarrollo, detectar automáticamente
  if (process.env.NODE_ENV === "development") {
    return process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  }

  // Fallback a dominio de producción
  return "https://turno-flash.vercel.app";
};

/**
 * Genera una URL absoluta para recursos estáticos
 * @param path Ruta relativa del recurso (ej: "/opengraph-image.jpg")
 * @returns URL absoluta completa
 */
export function getAbsoluteUrl(path: string): string {
  const baseUrl = getBaseUrl();
  // Asegurar que path empiece con /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Obtiene la URL base del sitio
 */
export function getSiteUrl(): string {
  return getBaseUrl();
}
