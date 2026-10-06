---
name: qa-piloto-cuba
description: Campaña QA de 2026-10-05/06 antes del piloto en Cuba; el plan priorizado de arreglos vive en .claude/PRPs/qa-piloto-cuba.md
metadata:
  type: project
---

Del 2026-10-05 al 06 se hicieron dos campañas de QA con agentes: una por roles (escritorio y web) y otra
**móvil primero** (Android barato con CPU lenta y 3G, iPhone con WebKit, el dueño trabajando desde el
teléfono, barrido visual a 320/360/390 px y auditoría de la app nativa). Cada hallazgo pasó por
verificadores independientes. Resultado: **`.claude/PRPs/qa-piloto-cuba.md`**, con P0=23, P1=33,
P2=17 y P3=26, más las decisiones D-01…D-15 que tiene que tomar Roberto.

**Why:** el piloto es en Cuba (conexión intermitente, datos caros, casi todo en el móvil), y lo más
importante es que sacar turno y reservar asientos no tenga fricción.
**How to apply:** atacar el plan por prioridad, marcar cada punto como resuelto en el PRP, y no reabrir
lo que está en la sección 6 (descartados). Los datos de prueba llevan el prefijo "QA" en "Organización
test" y se dejaron a propósito. Teléfonos de prueba: +5352564206 (turnos) y +5353077035 (viajes).
Relacionado: [[whatsapp-automatizaciones]], [[modulo-reserva-asientos]], [[reserva-online]].

## Decisión de roles (Roberto, 2026-10-06)

- **No habrá rol de chofer.** El chofer es solo texto en la salida (`driver_name`, `driver_phone`,
  `vehicle_description`); no inicia sesión.
- **Empleado (`staff`) = todo lo del día a día:** turnos, clientes y, en Viajes, **solo pasajes**:
  cargar, revisar, aprobar, cobrar anticipo y cancelar reservas. **Las salidas son solo del dueño.** **No:** Ajustes, Servicios,
  Profesionales, Reportes, Suscripción ni Invitar personal.
**Why:** el empleado opera, y el dueño controla el dinero del negocio, los precios y el personal.
**How to apply:** abrir a `staff` solo la escritura de `trip_bookings` (hoy solo owner/admin);
`trips` y `trip_pickup_points` siguen solo para owner/admin. En la UI, ocultar al staff crear/editar/duplicar/cancelar salida. **Rol `special`: aparcado a propósito (Roberto, 2026-10-06).** No está definido en ningún lado (la UI le oculta crear turnos, pero la BD le deja crear y borrar clientes y turnos). No tocarlo ni "arreglarlo" hasta que Roberto lo decida.

## Avance (actualizar al cerrar cada punto)

- **2026-10-06:** P0-01 a P0-05 (seguridad) hechos y verificados en producción: migración 048,
  `supabase/functions/_shared/auth.ts` en las 4 funciones de WhatsApp y la tarjeta "Tu equipo" en
  Invitar usuario. 
- Datos de prueba: el empleado `qa.staff.2@example.com` / `QaStaff*2026` (activo, "QA Empleado") sirve
  para probar el rol staff en "Organización test". `qa.verifier.g04@example.com` queda sin acceso.
- **2026-10-06:** P0-06, P0-07 y P0-08 hechos: turno para hoy, turnos seguidos y doble toque. La migración 049 agrega la restricción `appointments_staff_no_overlap` (EXCLUDE gist, rango semiabierto) y el error 23P01 se traduce en el servicio y en `public-booking`. 
- **2026-10-06:** P0-09 hecho. Las reservas públicas son idempotentes: la página manda `request_key` (`hooks/useRequestKey.ts`) y las edge functions llaman a `create_public_booking_once` / `create_trip_booking_once` (050), que **envuelven** a las RPC originales sin copiarlas. **Toda regla nueva de reserva va en las RPC originales, no en los wrappers.** Lo siguiente es **P0-10 + P0-11** (red caída y botón Atrás en /book y /trips; mismos archivos).
