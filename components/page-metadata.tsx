"use client";

import { useEffect } from "react";

interface PageMetadataProps {
  title: string;
  description?: string;
}

/**
 * Componente para actualizar dinámicamente el título y metadata de la página
 * Útil para páginas Client Components que no pueden exportar metadata directamente
 */
export function PageMetadata({ title, description }: PageMetadataProps) {
  useEffect(() => {
    // Actualizar el título de la página
    document.title = `${title} | Turno Flash`;

    // Actualizar meta description si se proporciona
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.setAttribute("name", "description");
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute("content", description);
    }

    // Actualizar Open Graph title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute("content", `${title} | Turno Flash`);

    // Actualizar Open Graph description si se proporciona
    if (description) {
      let ogDescription = document.querySelector(
        'meta[property="og:description"]'
      );
      if (!ogDescription) {
        ogDescription = document.createElement("meta");
        ogDescription.setAttribute("property", "og:description");
        document.head.appendChild(ogDescription);
      }
      ogDescription.setAttribute("content", description);
    }

    // Actualizar Twitter Card title
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (!twitterTitle) {
      twitterTitle = document.createElement("meta");
      twitterTitle.setAttribute("name", "twitter:title");
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.setAttribute("content", `${title} | Turno Flash`);

    // Actualizar Twitter Card description si se proporciona
    if (description) {
      let twitterDescription = document.querySelector(
        'meta[name="twitter:description"]'
      );
      if (!twitterDescription) {
        twitterDescription = document.createElement("meta");
        twitterDescription.setAttribute("name", "twitter:description");
        document.head.appendChild(twitterDescription);
      }
      twitterDescription.setAttribute("content", description);
    }
  }, [title, description]);

  return null;
}
