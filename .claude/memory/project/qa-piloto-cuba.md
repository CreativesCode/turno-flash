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
  - Pruebas: crear un negocio desechable `qa-fixture-*` (dueño, empleado, admin) con la clave de servicio de `.env.local`, probar con Playwright y **borrarlo al terminar** (el del 2026-10-06 ya se borró). Sin WhatsApp conectado no sale ningún mensaje real. Nunca probar sobre negocios reales.

- **2026-10-06: P2 en curso.** Hechos 03, 04, 05, 06, 07, 09, 12, 13, 14, 16, 17; P2-02 parcial. Migración 066 (SELECT de `storage.objects` para `trip-photos`: sin ella la API de Storage no copia ni borra). Lo no obvio:
  - `useLicense` es un `useQuery` compartido con `refetchOnWindowFocus: "always"` (con `staleTime` de 5 min, `true` no revalidaría al volver y se rompería P1-13). TanStack escucha `visibilitychange` en `window`: un evento sintético de prueba necesita `bubbles: true`.
  - Nombre del negocio: usar `useOrganizationModules().modules.name`, no consultas propias.
  - Invalidar solo `X.all` en las mutaciones: `lists()` + `all` lanzaba dos pedidos de la misma lista.
  - **No pasar Prettier a archivos enteros**: varios (p. ej. `services/trips.service.ts`, `ExceptionsEditor.tsx`) no están formateados y reformatea líneas ajenas.
  - Medir peso de páginas públicas: `npm run build:next`, servir `out/` con `python -m http.server` (parar el servidor antes de recompilar: bloquea `out/`) y abrir `/book.html?b=<slug>`.

- **2026-10-06: P2-01, P2-10 y P2-11 hechos.** Lo no obvio:
  - **Offline del panel (P2-01):** `@tanstack/react-query-persist-client` (D-01) con un persister propio sobre `localStorage` (`turnoflash:query-cache`, 24 h, `buster` = `NEXT_PUBLIC_BUILD_ID` de `next.config.ts`, así cada build descarta lo guardado). Solo se guardan las raíces de `PERSISTED_ROOTS` en `contexts/query-client-provider.tsx`: **una query nueva que deba verse sin señal hay que agregarla ahí**; huecos, asientos y clientes nunca. `auth-context` guarda `{user, profile}` en `turnoflash:offline-session` y, si la red falla o `getSession` tarda más de 8 s (refresca un token vencido), abre con eso y sigue reintentando. Cerrar sesión (o SIGNED_OUT) borra ambos y hace `queryClient.clear()`. Las mutaciones siguen `networkMode: "always"` a propósito: sin cola de escrituras offline.
  - **Probar offline:** abortar `supabase.co` con `page.route`; para simular token vencido, reescribir `expires_at` en la cookie `sb-*-auth-token` (base64). Se recupera solo ~13 s después de volver la red.
  - **Reserva pública (P2-10):** `useSessionState` (sessionStorage por campo, `booking:<slug>:*` / `trips:<slug>:*`) y `useStepHistory` lee el paso de `history.state` al montar.

- **2026-10-06: P2-15 hecho** (guía de primeros pasos, pedida por Roberto para gente **poco ducha en tecnología y con fotos reales del sistema**). `components/onboarding/SetupGuide.tsx` + `OnboardingService.getProgress` (conteos head por módulo). Fotos en `public/images/guide/<paso>.webp` (520x933, 15-35 KB, solo se baja la del paso abierto), sacadas con Playwright a 390x700 @2x, `--lang=es-ES`, sobre un negocio desechable "Barbería La Esquina" (ya borrado), con el botón clave resaltado con un contorno naranja inyectado por CSS. **Si cambia una de esas pantallas, rehacer su foto.** Los textos nombran los botones tal cual («Crear servicio», «Guardar cambios»…): si se renombra un botón, actualizar la guía.

- **2026-10-06: P2 cerrado** con P2-02 (páginas públicas sin AuthProvider ni supabase-js; Zod diferido) y P2-08 (script post-build para Windows). Detalle técnico en [[arquitectura-static-export]].

## Qué falta del plan (al 2026-10-08)

- **P0, P1 y P2 cerrados en código** salvo P1-26 (iOS necesita Mac). Sigue **P3** (26 puntos menores en el PRP).
- **Sin subir:** `main` local va **por delante de `origin/main`** con todo el trabajo del 5-6 oct (60+ commits).
  Roberto todavía no pidió el push; Vercel no tiene nada de esto hasta que se suba.
- **Probar en teléfono real** (hay que regenerar la APK: `npm run mobile:build` + Android Studio): versión del
  WebView (P0-23), botón Atrás físico (P0-12), sesión nativa (P1-25), compartir lista (P1-16), safe area (P1-23),
  **abrir sin señal** (P2-01), **menú sin recarga** (P2-08) y la guía de primeros pasos (P2-15).
- **SMTP propio** para que llegue "¿Olvidaste tu contraseña?" a los dueños (configurarlo en Supabase Auth).
- **Pedir a cada dueño su WhatsApp de contacto** (`organizations.whatsapp_phone`); la guía de primeros pasos ya
  se lo pide al dueño nuevo.
- **Pendientes menores:** reportes con la zona del negocio (P0-13, punto 7); el detalle de una salida muestra la
  fecha como `2026-10-09` (se ve en una foto de la guía); la web en navegador no abre sin señal (haría falta el
  service worker descartado en D-02).
- Los turnos de prueba T-0062 y T-0063 (7 y 8 oct) ya pasaron. En producción quedan los negocios `qa-*` y
  "Organización test" con datos "QA", a propósito.

## P3 cerrado (2026-10-08)

- **Todo hecho salvo `special`** (P3-18, aparcado por Roberto) y el reintento del resumen diario, que **no se hace**:
  OpenWA responde 500 y entrega, reintentar duplicaría.
- **Migraciones 067-072 aplicadas.** 067 días de licencia redondeados hacia arriba y gracia de 7 días exactos
  (los textos «Te quedan N días de acceso» salen de `check_license_status`; `getGracePeriodDays()` devuelve 7 fijo).
  068 `contact_phone` en los payloads públicos y sin `driver_phone`. 069 apellido opcional en las RPC de reserva.
  070 borrar clientes/turnos solo owner/admin (RESTRICTIVE). 071 `notify_business_new` solo con `source = web`,
  numeración con lock por organización + índices únicos, índice por `booking_phone_key`. 072 RevenueCat: los eventos
  **SANDBOX solo se auditan** y una compra nunca acorta la licencia (GREATEST).
- **Edge functions desplegadas el 2026-10-08** (Roberto lo pidió esa vez; no es permiso permanente, preguntar la
  próxima): `public-booking`, `public-trips`, `wa-trip-send`, `daily-summary`, `wa-campaign`, `wa-inbound`.
  Comprobadas desde fuera con la clave anon las dos públicas. **Sin probar con teléfono real:** 👍 = confirmar,
  nota de voz → aclaración, resumen diario con viajes y moneda.
- **Ojo con las compras de prueba:** `.env.local` usa la key `test_` de RevenueCat (Test Store). Desde la 072 esas
  compras ya no extienden la licencia; para probar el flujo completo hay que mirar `subscription_events`.
- **Lo no obvio:**
  - `Field` (`components/ui/sheet.tsx`) enlaza solo la etiqueta con su primer hijo (`useId` + `cloneElement`).
  - `fmtMoney` fuerza el separador de miles; Reportes y gráficos usan `useMoney()` (ya no existe `formatMoney`).
  - Rol visible: `ROLE_META[role].label`, nunca el valor crudo.
  - Apellido opcional en todos lados (reserva pública, ficha de cliente, alta rápida): se guarda `''`.
  - Páginas públicas: `components/booking/BusinessInfo.tsx` (`BusinessContactLink`, `BusinessTimeNote`);
    `focusNextOnEnter` y `stickyActionClasses` en `BookingSteps.tsx`; el cliente se recuerda en `localStorage`
    `turnoflash:customer`; con un solo profesional se salta «¿Con quién?».
  - La Lista de turnos filtra estado, texto y «Mis turnos» **en el servidor** (solo en vista Lista).
    «Mis turnos» aparece si `staff_members.user_id` = usuario; el dueño lo elige en Profesionales («Cuenta de la app»).
  - `updateStatus` exige en el UPDATE el estado que validó: 0 filas también puede ser «alguien lo cambió».
  - El layout del panel redirige a Inicio si la ruta es de un módulo apagado (`MODULE_ROUTES`), salvo admin.
  - `sendReminder` trata `code: "HTTP_500"` de wa-send como enviado.
  - Las `public_*_info` no tienen EXECUTE para `anon` (las llama la edge con clave de servicio): al ensayar, no usar
    `SET LOCAL ROLE anon`. Para ensayar las RPC de reserva sin crear nada, pasar un `service_id`/`trip_id` inexistente.
  - **Scripts de edición:** un heredoc de Bash colapsa `\\` en `\` y se trunca si es largo; escribir el script con
    Write en el scratchpad y ejecutarlo.
  - **Rehacer una foto de la guía:** `playwright-core` en el scratchpad + Chromium de `ms-playwright`, 390x700 con
    `deviceScaleFactor: 2`, `sharp().resize(520, 933).webp({ quality: 80 })`, contorno naranja `#f97316` por estilo
    en línea, sobre un negocio `qa-fixture-*` creado con la clave de servicio y borrado en el `finally`.
- **Manual y guía al día:** `docs/user-manual/` actualizado con lo visible nuevo; `passenger.webp` rehecha. Las otras
  7 fotos muestran la cabecera sin el botón «Actualizar» (diferencia menor, sin rehacer).
- **Pendiente:** P3 está commiteado en local (7 commits del 2026-10-08) pero **sin subir**: `main` va 70 commits por delante de `origin/main` (el último ignora `.playwright-mcp/`); probar en la APK la barra de estado
  (`useCapacitor` montado en el layout) junto con el resto de la lista de teléfono real.
- **Visto de paso:** 6 negocios reales (AgroRed, DveloxSoft SC, LeoDev, Negocio, Negocio test registro, Notengo)
  tienen la licencia vencida hace más de 100 días. `roleLabel` en `dashboard/page.tsx` es código muerto anterior.
