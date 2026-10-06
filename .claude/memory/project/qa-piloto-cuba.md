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
- **2026-10-06:** P0-09 hecho. Las reservas públicas son idempotentes: la página manda `request_key` (`hooks/useRequestKey.ts`) y las edge functions llaman a `create_public_booking_once` / `create_trip_booking_once` (050), que **envuelven** a las RPC originales sin copiarlas. **Toda regla nueva de reserva va en las RPC originales, no en los wrappers.** 
- **2026-10-06:** P0-10 y P0-11 hechos en /book y /trips. `useStepHistory` mete cada paso en el historial (Atrás = paso anterior; la confirmación usa `replace` para que Atrás no reenvíe). Los borradores (`DetailsDraft`, `SeatsSubmit`) viven en los Flows. El error de red tiene código propio `network`; un refresco fallido con datos ya cargados solo muestra un aviso. **Ojo al probar:** con el modo offline de CDP, TanStack *pausa* la consulta (no falla); para simular "conectado sin datos" hay que abortar las peticiones con `page.route`. 
- **2026-10-06:** P0-12 hecho. Cada hoja (`Sheet`, y por tanto `ConfirmSheet`) y el `Drawer` agregan una entrada al historial con `useBackToClose`: Atrás cierra solo la de arriba. Si una hoja **navega** a otra pantalla, hay que llamar antes al `release` que devuelve el hook (como hacen los enlaces del Drawer), o el `history.back()` del cierre deshace la navegación. Nueva dependencia `@capacitor/app` (D-07): `NativeBackButton` en el layout raíz; **pendiente probarlo en la APK** (requiere `npm run mobile:build`). 
- **2026-10-06:** P0-13 (casi) y P0-19 hechos. La migración 051 calcula la ventana de recordatorios con `AT TIME ZONE o.timezone`, solo para turnos confirmed/reminded/client_confirmed, y respeta `enable_reminders`. En `wa-send` el dedup por intent **incluye "failed"**, porque OpenWA responde 500 y aun así entrega: sin eso, el cron duplicaba recordatorios. El registro usa America/Havana por defecto. **Todos los negocios están en Cuba** (Roberto, 2026-10-06): se pasaron a America/Havana, junto con sus turnos y salidas. 
- **2026-10-06:** P0-14 hecho. **`services.currency` sigue a `organizations.currency` por trigger** (052): no hay que pasar la moneda al crear servicios, y cambiar la del negocio la cambia en todos sus servicios. 
- **2026-10-06:** P0-15 hecho. La migración 053 impide bajar `trips.total_seats` por debajo de lo vendido y que cualquier reserva (nueva, reactivada o aprobada) supere el cupo. Usa el lock `trip_booking:<trip_id>` de `create_trip_booking`. Los errores llegan como `seats_below_taken:N` / `no_seats_left:N` y `capacityError()` (trip-bookings.service) los traduce. 
- **2026-10-06:** P0-16 hecho. Las paradas se validan con `pickupPointSchema` (misma regla que el CHECK de 037) y `savePickupPoints`/`copyPickupPoints` lanzan si algo falla; crear o duplicar borra la salida si sus paradas no se guardaron. Visto de paso: **F26 confirmado en vivo**, el insert en `error_logs` da 400 (`id` NULL). 
- **2026-10-06:** P0-17 hecho. **Una sola regla de teléfonos** en tres lugares que deben ir juntos: `booking_phone_key` (SQL, 054), `phoneToChatId` (`_shared/openwa.ts`) y `utils/phone.ts`. `+`/`00` = internacional; si no, lleva el código de país solo si empieza con él **y tiene más de 8 dígitos** (móviles cubanos de 8 que empiezan por 53). Se guarda `+<dígitos>`. Si se cambia la regla, cambiarla en los tres y redesplegar las funciones que importan openwa.ts. 
- **2026-10-06:** P0-18 hecho en código. `classifyReply` ya no cancela por "NO" como primera palabra ni por "REAGENDAR"; una palabra de cancelación explícita en cualquier parte cancela, salvo que vaya negada ("no cancelar", "no quiero cancelar"). Si el último saliente al chat era de un viaje, no se tocan turnos. Con varios turnos abiertos, "CANCELAR" sin número envía el intent `clarify_which` (055) con la lista, y "CANCELAR T-0045" apunta a ese turno. Quedan **T-0061 y T-0062** (mañana 10:00 y 11:00, +5352564206) para que Roberto lo pruebe respondiendo desde el teléfono. Lo siguiente es **P0-21** (eliminar cuenta).
