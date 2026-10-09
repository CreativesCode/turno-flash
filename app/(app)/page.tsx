import { getAbsoluteUrl } from "@/utils/metadata";
import type { Metadata } from "next";
import HomePageClient from "./home-client";

const ogImageUrl = getAbsoluteUrl("/opengraph-image.jpg");

export const metadata: Metadata = {
  // The home page is what search engines show: no "Inicio | Turno Flash"
  title: { absolute: "Turno Flash: turnos y venta de pasajes con WhatsApp" },
  description:
    "Agenda de turnos y venta de pasajes para tu negocio, con página de reservas y avisos por WhatsApp. Para salones, barberías, clínicas y agencias de viajes.",
  alternates: { canonical: "/" },
  keywords: [
    "sistema de reservas",
    "gestión de turnos",
    "agenda online",
    "reservas móvil",
    "salones de belleza",
    "barberías",
    "clínicas",
    "talleres",
    "venta de pasajes",
    "reserva de asientos",
    "viajes y excursiones",
    "agencias de viajes",
  ],
  openGraph: {
    title: "Turno Flash - Turnos y venta de pasajes para tu negocio",
    description:
      "Agenda de turnos y venta de pasajes con página de reservas y avisos por WhatsApp. Para salones, barberías, clínicas, talleres y agencias de viajes.",
    type: "website",
    url: getAbsoluteUrl("/"),
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Turno Flash - Sistema de Reservas",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Turno Flash - Turnos y venta de pasajes para tu negocio",
    description:
      "Agenda de turnos y venta de pasajes con avisos por WhatsApp. Optimizado para móvil, bajo consumo de datos.",
    images: [ogImageUrl],
  },
};

export default function Home() {
  return <HomePageClient />;
}
