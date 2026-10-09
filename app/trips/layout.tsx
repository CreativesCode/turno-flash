import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reservar asientos",
  description: "Reserva tus asientos online en segundos: elige la salida y cuántos viajan.",
  openGraph: {
    title: "Reservar asientos",
    description: "Elige la salida y cuántos viajan, y reserva en segundos.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
