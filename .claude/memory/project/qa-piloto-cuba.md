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
- **2026-10-06:** P0-18 hecho en código. `classifyReply` ya no cancela por "NO" como primera palabra ni por "REAGENDAR"; una palabra de cancelación explícita en cualquier parte cancela, salvo que vaya negada ("no cancelar", "no quiero cancelar"). Si el último saliente al chat era de un viaje, no se tocan turnos. Con varios turnos abiertos, "CANCELAR" sin número envía el intent `clarify_which` (055) con la lista, y "CANCELAR T-0045" apunta a ese turno. **Verificado por Roberto desde el teléfono** el 2026-10-06: aclaración, lista y "CANCELAR T-0061" funcionan.
- **2026-10-06, dos incidentes encontrados en la prueba real de P0-18:** (1) el control de P0-02 rechazaba las llamadas entre funciones, porque en Edge `SUPABASE_SERVICE_ROLE_KEY` es `sb_secret_...` y no un JWT; quedaron cortados durante ~3 h las respuestas y los recordatorios (solo afectó a T-0062, de prueba). Arreglado en `_shared/auth.ts`. (2) Los alias `@lid` se resuelven con `message_id` de antes de junio; un cliente nuevo que responda desde un alias desconocido no se puede ubicar hasta que OpenWA deje de dar 500 (es del servidor OpenWA, no de la app). Ver [[whatsapp-automatizaciones]].
- **2026-10-06:** formato nuevo de los mensajes al cliente, pedido por Roberto: nombre del negocio arriba (y no repetido dentro del texto), nota de mensaje automático de Turno Flash abajo, y la línea "¿Dudas? Escribe a…" solo donde hace falta. Migración 057 (`organizations.contact_name`) y tarjeta "Contacto para tus clientes" en Ajustes. Detalle en [[whatsapp-automatizaciones]]. **Casi ningún negocio real tiene cargado `whatsapp_phone`**: sin ese número los mensajes no muestran el contacto. Hay que pedírselo a cada dueño antes del piloto.
- **2026-10-06:** las monedas ARS de DveloxSoft SC, Notengo y Negocio se pasaron a CUP (Roberto confirmó que están en Cuba).

- **2026-10-06:** P0-22 hecho. Un fallo de red ya no se trata como "sin sesión" ni "sin perfil": `auth-context` expone `connectionError` y `retry` (reintenta cada 10 s, al volver `online` y al volver a primer plano), conserva el perfil ya cargado y ya no tiene el timeout de 10 s. `ProtectedRoute` solo redirige con `!loading && !user` y no muestra la página hasta tener perfil; si tarda más de 15 s, muestra "Conectando…/Sin conexión" con Reintentar. El login salta al panel si la sesión se recupera sola. `useOrganizationModules` expone `ready`: **no decidir nada con los módulos ni la moneda hasta `ready`** (los valores por defecto son Turnos y USD); en Ajustes, la tarjeta de moneda espera a `ready`. Verificado con Playwright: con un token vencido y Supabase bloqueado ya no manda al login. Ojo: `getSession` puede quedar ~30 s pendiente porque auth-js reintenta el refresh, así que la primera pantalla es "Conectando…" y no "Sin conexión".

- **2026-10-06:** cerrados los P0 restantes. P0-24: número de soporte +5352564206 en `SUPPORT_WHATSAPP_URL` (`config/constants.ts`), botón `SupportWhatsAppLink` en bloqueo, avisos y Suscripción. P0-21: migración 058 (FKs de auditoría a `auth.users` con `ON DELETE SET NULL`) y `delete-account` reordenada; probada con un usuario desechable. P0-23: `minWebViewVersion: 111` + `public/webview-update.html` (entra en la próxima APK). Pendientes menores: 059 (las RPC de reserva prefieren la ficha activa, copiadas de la definición viva) y 060 (`my_access_revoked()`: "Tu acceso fue desactivado"). Para probar el login sin contraseñas conocidas se crean usuarios desechables con la clave de servicio de `.env.local` y se borran al final. En producción quedan 3 negocios `qa-*` de la campaña del 5-6 oct.

- **2026-10-06:** D-14 hecho. Migración 061: el `staff` tiene INSERT y UPDATE en `trip_bookings` (sin DELETE; nada borra reservas); `trips` y `trip_pickup_points` siguen solo para owner/admin. En la UI, el detalle de la salida (todo es de pasajes) habilita al staff; la lista de salidas sigue con `canManage` solo para owner/admin. Ensayado por rol en BEGIN/ROLLBACK (update de reserva sí; update de salida y delete de reserva no). El insert no se probó en vivo porque dispara el WhatsApp al pasajero. `special` sigue fuera a propósito.

- **2026-10-06: P1 cerrados salvo P1-26** (iOS necesita Mac). Migraciones 061-065. Lo no obvio:
  - **Reprogramar (062):** un trigger BEFORE resetea estado/recordatorio/confirmación al mover fecha u hora, y uno AFTER manda el intent `rescheduled`. **Las listas de columnas de un trigger ignoran cambios hechos por triggers BEFORE**: por eso el AFTER escucha `appointment_date, start_time` y compara `rescheduled_at`. `wa-send` ignora recordatorios enviados antes de `rescheduled_at`.
  - **RLS rechaza en silencio**: un UPDATE bloqueado (licencia vencida, sin permiso) devuelve 0 filas y ningún error. Los servicios de turnos, salidas y pasajes piden `.select("id")` y fallan si no vuelve nada. Seguir ese patrón en cualquier escritura nueva.
  - **Sesión nativa (P1-25):** en Capacitor el cliente es un singleton de supabase-js con `@capacitor/preferences`; la web sigue con cookies. Tras actualizar la APK, los usuarios nativos inician sesión una vez.
  - **Recuperar contraseña (P1-28):** el email usa flujo implícito a propósito (se abre en otro dispositivo o fuera de la app, donde no existe el verificador PKCE). **El SMTP por defecto de Supabase solo envía a miembros del equipo del proyecto y con un límite muy bajo**: sin SMTP propio, los dueños no reciben el email.
  - **Safe area (P1-23):** todo lee `--safe-area-inset-*` (Capacitor 8 las rellena en Android 15); el body no aplica arriba/abajo cuando están las barras del panel (`body:has([data-mobile-topbar])`).
  - Plugins nativos nuevos: `@capacitor/share` y `@capacitor/preferences` (D-07); Android ya sincronizado.
  - Pruebas: negocio desechable `qa-fixture-*` con dueño, empleado y admin, creado con la clave de servicio. Usarlo en vez de tocar negocios reales.

- **2026-10-06: P2 en curso.** Hechos 03, 04, 05, 06, 07, 09, 12, 13, 14, 16, 17; P2-02 parcial. Migración 066 (SELECT de `storage.objects` para `trip-photos`: sin ella la API de Storage no copia ni borra). Lo no obvio:
  - `useLicense` es un `useQuery` compartido con `refetchOnWindowFocus: "always"` (con `staleTime` de 5 min, `true` no revalidaría al volver y se rompería P1-13). TanStack escucha `visibilitychange` en `window`: un evento sintético de prueba necesita `bubbles: true`.
  - Nombre del negocio: usar `useOrganizationModules().modules.name`, no consultas propias.
  - Invalidar solo `X.all` en las mutaciones: `lists()` + `all` lanzaba dos pedidos de la misma lista.
  - **No pasar Prettier a archivos enteros**: varios (p. ej. `services/trips.service.ts`, `ExceptionsEditor.tsx`) no están formateados y reformatea líneas ajenas.
  - Medir peso de páginas públicas: `npm run build:next`, servir `out/` con `python -m http.server` (parar el servidor antes de recompilar: bloquea `out/`) y abrir `/book.html?b=<slug>`.

## Qué falta del plan (al 2026-10-06)

- **P0 y P1 cerrados en código** salvo P1-26 (Mac). En teléfonos reales falta: medir la versión del WebView (P0-23), el botón Atrás físico (P0-12), la sesión nativa (P1-25), compartir lista (P1-16) y la safe area (P1-23). Hay que regenerar la APK (`npm run mobile:build` + Android Studio).
- **SMTP propio** para que llegue "¿Olvidaste tu contraseña?" a los dueños (configurarlo en Supabase Auth).
- **Pendiente menor pasado a P2:** reportes con la zona del negocio (P0-13, punto 7).
- **P2 pendientes:** 01 (offline: TanStack `offlineFirst` + persistencia, D-01 aprobado), 02 resto (route group público sin AuthProvider), 08 (prefetch 404 por compilar en Windows), 10 (borrador de reserva en sessionStorage), 11 (saltar días sin huecos), 15 (guía de primeros pasos). Después P3.
- Turnos de prueba vivos a +5352564206: **T-0062** (7 oct 11:00) y **T-0063** (8 oct 15:00).
