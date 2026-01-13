import { getAbsoluteUrl } from "@/utils/metadata";
import type { Metadata } from "next";
import HomePageClient from "./home-client";

const ogImageUrl = getAbsoluteUrl("/opengraph-image.png");

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Turno Flash es la solución perfecta para salones, barberías, clínicas y talleres. Optimizado para móvil, bajo consumo de datos y fácil de usar. Gestiona tus turnos desde cualquier lugar.",
  keywords: [
    "sistema de reservas",
    "gestión de turnos",
    "agenda online",
    "reservas móvil",
    "salones de belleza",
    "barberías",
    "clínicas",
    "talleres",
  ],
  openGraph: {
    title: "Turno Flash - Gestiona tus turnos desde cualquier lugar",
    description:
      "Sistema de reservas móvil-first para negocios. Optimizado para salones, barberías, clínicas y talleres.",
    type: "website",
    url: getAbsoluteUrl("/"),
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Turno Flash - Sistema de Reservas",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Turno Flash - Sistema de Reservas Inteligente",
    description:
      "Gestiona tus turnos desde cualquier lugar. Optimizado para móvil, bajo consumo de datos.",
    images: [ogImageUrl],
  },
};

export default function Home() {
  return <HomePageClient />;
}
