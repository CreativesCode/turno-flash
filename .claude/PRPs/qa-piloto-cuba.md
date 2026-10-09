# Plan de arreglos QA — Piloto Cuba (Turno Flash)

> Para: Roberto (dueño del producto). Fecha: 2026-10-06.
> Fuentes: campaña QA de escritorio y web (hallazgos `F01–F115`, `G01–G48`) y campaña **móvil primero** (hallazgos `M01–M71`).
> Cada hallazgo pasó por dos verificadores independientes. Aquí solo entran en fases los **confirmados**. Los descartados y los que están en disputa se listan en la sección 6, para que no se pierda nada.
> Cuando un hallazgo de escritorio y uno móvil tienen la misma causa, se unen en un solo punto (ej. `F14+M29`). Cada punto trae una línea `Téc:` con archivo:línea y el arreglo, para que un desarrollador lo ejecute sin buscar.
> Regla de prioridad: **asumimos que todos los usuarios están en el teléfono**. Si algo falla en móvil, sube de prioridad.

---

## 1. Resumen ejecutivo

- **Sacar turno (clientes, /book):** funciona de punta a punta en Android barato e iPhone, sin reservas duplicadas por doble toque. Pero la página pesa unos 440 KB, en 3G tarda de 8 a 37 s en mostrar algo útil, el botón Atrás del teléfono saca al cliente del flujo y borra lo elegido, y si la red falla un momento se pierde lo escrito. Los precios salen en **US$** cuando el negocio cobra en CUP.
- **Sacar turno (dueños, panel):** **no se puede crear un turno para hoy** (fallo de fecha en toda América), los turnos seguidos (09:00–09:30 y 09:30) se rechazan, no se puede reprogramar, y completar un turno exige 5 cambios de estado y un WhatsApp. En móvil la barra de pestañas no queda fija y el '+' central no abre el formulario.
- **Reservar asientos (pasajeros, /trips):** el flujo funciona y el cupo se respeta en la reserva web. Pero si se corta la respuesta, el pasajero ve un error aunque la reserva quedó hecha, y al reintentar choca con el límite o reserva dos veces. Tampoco hay botón Reintentar.
- **Reservar asientos (dueños):** desde el panel se puede **sobrevender** (bajar el cupo o cargar a mano sin control), los puntos de recogida mal cargados **se pierden mostrando "Salida actualizada"**, la lista de pasajeros no se actualiza en vivo y en el teléfono la lista de salidas se sale de la pantalla.
- **Riesgos principales del piloto:** (1) **cualquier persona puede descargar los datos de clientes y turnos de todos los negocios** usando la clave pública; (2) las zonas horarias en UTC desplazan "hoy", los recordatorios y las salidas entre 4 y 5 h; (3) las respuestas de WhatsApp pueden **cancelar el turno equivocado**; (4) con la red cubana, el dueño queda atascado en el login o ve "Sin organización asignada"; (5) no hay forma de pagar la licencia desde Cuba; (6) falta comprobar que `vercel.app` y `supabase.co` se puedan abrir desde ETECSA y Nauta.

**Conteo:** P0 = 23 puntos · P1 = 33 puntos · P2 = 17 puntos · P3 = 26 puntos (cada punto agrupa uno o varios hallazgos).

---

## 2. Fases priorizadas

Formato de cada punto: **id · hallazgos · título**. Quién lo sufre / qué pasa / arreglo (con línea `Téc:` para el desarrollador) / cómo verificarlo.

### P0 — Bloqueantes antes del piloto (reservas, dinero, seguridad, pérdida de datos)

**P0-01 · ✅ HECHO 2026-10-06 (migración 048) · F01+G01+F06 · Datos de clientes y turnos de todos los negocios expuestos a cualquier visitante**
- Quién: todos los clientes finales (privacidad) y todos los negocios.
- Qué pasa: con la clave pública que viene dentro de la app, cualquiera puede leer todos los clientes de cualquier negocio (nombre, teléfono, email, notas), todos los turnos de la plataforma y la lista de organizaciones con su WhatsApp. Un dueño logueado puede leer lo mismo de otros negocios.
- Arreglo: una migración que cierre las tres puertas.
  - Téc: nueva migración `048_secure_views_rpcs.sql`: `ALTER FUNCTION public.search_customers_fulltext(UUID,TEXT,BOOLEAN,INTEGER,INTEGER) SECURITY INVOKER; REVOKE EXECUTE … FROM PUBLIC, anon; GRANT … TO authenticated;` (origen `012_performance_indexes.sql:76`). `ALTER VIEW public.appointments_with_details SET (security_invoker=true); REVOKE ALL … FROM anon;` (`010_appointment_system.sql:908`). `ALTER VIEW public.organizations_with_license_status SET (security_invoker=true); REVOKE ALL … FROM anon;` (`040_license_view_currency.sql:11`). Agregar a la regla de memoria "recrear la vista al agregar columna" que siempre lleve `security_invoker`. Antes de desplegar, confirmar que hay políticas SELECT por organización en customers, services, staff_members y organizations. Lanzar una consulta anónima contra **todas** las vistas de `public`.
- Verificar: el anónimo recibe `permission denied` o 0 filas; un dueño ve solo su organización; el admin sigue viendo todas.

**P0-02 · ✅ HECHO 2026-10-06 (`_shared/auth.ts`; wa-send, wa-trip-send, send-reminders y daily-summary desplegadas) · G03 · Las funciones de WhatsApp se pueden llamar con la clave pública**
- Quién: dueños (riesgo de que bloqueen su número de WhatsApp) y clientes (mensajes falsos de "tu turno fue cancelado").
- Qué pasa: `wa-send`, `wa-trip-send` y `send-reminders` aceptan cualquier llamada que traiga la clave pública. Junto con P0-01, cualquiera puede mandar mensajes ilimitados desde el número del negocio.
- Téc: en `supabase/functions/wa-trip-send/index.ts:~107` y `send-reminders/index.ts:~33` (también en `daily-summary`), responder 403 si `Authorization !== Bearer ${SUPABASE_SERVICE_ROLE_KEY}` (cron 025 y triggers 044 ya envían esa clave). En `wa-send/index.ts:~68` aceptar service role para todos los intents. Con el JWT de un usuario, aceptar solo `reminder_manual` y solo si el turno es de su organización (cliente con el JWT del usuario más SELECT bajo RLS). El botón manual del panel (`appointments.service.ts:634`) sigue funcionando.
- Verificar: una llamada con la clave pública devuelve 403; el recordatorio manual del dueño se sigue enviando.

**P0-03 · ✅ HECHO 2026-10-06 (migración 048) · F08 · Un dueño puede ver, editar y borrar perfiles de otros negocios**
- Quién: todos los negocios. Un dueño puede desactivar al dueño de otro negocio o al admin.
- Téc: nueva migración: helper `auth_user_org_id()` (SECURITY DEFINER STABLE). Volver a crear `admins_select_all_profiles`, `admins_update_all_profiles` (USING + WITH CHECK) con `auth_user_role()='admin' OR (auth_user_role()='owner' AND organization_id=auth_user_org_id())`. INSERT/DELETE solo admin (`005_fix_rls_infinite_recursion.sql:48-100`, `006:10`).
- Verificar: el dueño ve solo los perfiles de su organización; un UPDATE sobre otra organización afecta 0 filas; el admin sigue listando a todos.

**P0-04 · ✅ HECHO 2026-10-06 (migración 048) · F07 · Un dueño puede extenderse la licencia desde la API**
- Quién: el modelo de cobro (cualquier dueño se pone la licencia hasta 2099).
- Téc: nueva migración: `CREATE OR REPLACE public.enforce_module_change_is_admin()` (de `033_seat_booking.sql:74-98`). Ampliar el `IS DISTINCT FROM` a `license_start_date, license_end_date, subscription_status, subscription_platform, subscription_product_id, subscription_updated_at, is_active`. Mantener la excepción `auth.uid() IS NULL`. Antes, confirmar que el webhook de RevenueCat (`021`) corre sin auth.uid(). Actualizar la memoria (`modulo-reserva-asientos.md:49-51`).
- Verificar: un UPDATE de `license_end_date` como dueño se rechaza; como admin funciona.

**P0-05 · ✅ HECHO 2026-10-06 (migración 048 + tarjeta "Tu equipo" en Invitar usuario, `components/organizations/TeamCard.tsx`). Pendiente menor resuelto el 2026-10-06 (migración 060 `my_access_revoked()`: el panel dice "Tu acceso fue desactivado") · G04 · Un empleado despedido conserva el acceso a toda la base de clientes**
- Quién: los dueños con personal.
- Qué pasa: las reglas de la base de datos no miran `is_active`; el propio empleado se puede reactivar y el dueño no tiene botón para quitar el acceso.
- Téc: migración: helper `is_active_member(org)` con `AND is_active=true` y volver a crear las políticas por organización de `027_enforce_license_on_writes.sql:180-209` y las de trips. En `prevent_role_org_change` (`026:188-218`) proteger también `is_active`. En la UI: botón "Quitar acceso" en la lista de miembros (`app/dashboard/organizations/details/page.tsx:308,437`) mediante una RPC `deactivate_org_member`.
- Verificar: un empleado inactivo lee 0 clientes y no se puede reactivar solo.

**P0-06 · ✅ HECHO 2026-10-06 · F04 · No se puede crear un turno para HOY desde el panel (Cuba y toda América)**
- Quién: el dueño con un cliente que llega sin cita, que es el caso más común.
- Téc: `schemas/appointment.schema.ts:105-109` → `return data.appointment_date >= getLocalDateString();` (importar desde `@/utils/date`).
- Verificar: con el dispositivo en America/Havana se crea un turno para hoy a las 20:00.

**P0-07 · ✅ HECHO 2026-10-06 · F38 · El panel rechaza turnos seguidos ("ya tiene un turno en ese horario")**
- Quién: el dueño que agenda turnos uno detrás de otro (09:00–09:30 y luego 09:30).
- Téc: `services/appointments.service.ts:374-381` → `startTime < apt.end_time.slice(0,5) && endTime > apt.start_time.slice(0,5)`.
- Verificar: con un turno 09:00–09:30, uno nuevo 09:30–10:00 se acepta y uno 09:15–09:45 se rechaza.

**P0-08 · ✅ HECHO 2026-10-06 (guard de doble toque + migración 049 `appointments_staff_no_overlap`) · F16+F36 · Doble toque en "Crear" duplica turnos solapados (y manda WhatsApp doble); sin bloqueo en la base**
- Quién: el dueño en un Android lento (la campaña móvil no duplicó en el Pixel, pero sí en escritorio con CPU lenta).
- Téc: (a) guard `savingRef` antes del primer `await` en `handleSave` de `app/dashboard/appointments/page.tsx:327`, `services/page.tsx:108` y del formulario de staff. (b) Migración: `btree_gist` + `EXCLUDE USING gist (staff_id WITH =, tsrange(appointment_date+start_time, appointment_date+end_time) WITH &&) WHERE (staff_id IS NOT NULL AND status IN ('pending','confirmed','reminded','client_confirmed','checked_in','in_progress'))`. Antes, revisar si hay solapamientos existentes. Mapear el error 23P01 a "El horario seleccionado no está disponible". Esto también cierra la carrera web contra panel (F36).
- Verificar: doble toque con CPU 6x → 1 fila; dos inserts simultáneos → uno falla con el mensaje.

**P0-09 · ✅ HECHO 2026-10-06 (migración 050: `create_public_booking_once` / `create_trip_booking_once` + `hooks/useRequestKey.ts`) · F20 · Si se corta la respuesta, la reserva queda hecha pero el cliente ve error; al reintentar choca o duplica**
- Quién: clientes y pasajeros en datos cubanos (respuesta perdida = caso frecuente).
- Téc: migración: columna `booking_request_key uuid` + índice único parcial `(organization_id, booking_request_key)` en `appointments` y `trip_bookings`. En `create_public_booking` (`029:467`) y `create_trip_booking` (`042`), si la clave ya existe, devolver el mismo éxito **antes** de validar hueco y límite. Edge functions: `request_key: z.string().uuid().optional()` → `p_request_key`. Cliente: `crypto.randomUUID()` en un `useRef` al entrar a "Tus datos" (`BookingFlow.tsx`, `TripsFlow.tsx`), que se renueva solo si cambia el hueco o la salida.
- Verificar: con la respuesta abortada a propósito, el reintento muestra la confirmación con el mismo número (T-/V-) y no hay fila duplicada.

**P0-10 · ✅ HECHO 2026-10-06 · F03+F51+M21 · Un fallo de red en segundo plano reemplaza la reserva pública por "Reservas no disponibles" y borra lo escrito**
- Quién: todo cliente y pasajero con datos intermitentes (polling cada 30 s + al volver de WhatsApp).
- Téc: `components/public-trips/TripsFlow.tsx:67` y `components/booking/BookingFlow.tsx:62`: la pantalla de error solo cuando `error && !info`. Con `info && error`, mantener el paso y mostrar la línea "Sin conexión, reintentando…". En la pantalla sin datos, título "Sin conexión" y `<Button onClick={refetch}>Reintentar</Button>`. En `usePublicTrips.query.ts:36-39` (y su equivalente de turnos), invalidar en `onSuccess`, no en `onSettled`. `usePublicBooking.query.ts` / `usePublicTrips.query.ts`: `retry: 3`. En `BookingSteps.tsx:213` cambiar el error de horarios por un texto en español con Reintentar.
- Verificar: cortar la red 30 s a mitad del formulario → al volver la red el formulario sigue con lo escrito.

**P0-11 · ✅ HECHO 2026-10-06 (`hooks/useStepHistory.ts`, borradores en los Flows) · M06+M07+F49+F61+M10 · Atrás del teléfono o "Volver" saca al cliente del flujo público o borra lo elegido**
- Quién: todos los clientes en Android e iPhone (el gesto atrás es la forma natural de volver).
- Qué pasa: los pasos no crean historial, así que Atrás vuelve a WhatsApp y Adelante recarga desde cero. Volver un paso, "Horario ocupado" o "Se llenó esa salida" borran asientos, parada, 4 nombres y datos personales. Además "Se llenó esa salida" aparece aunque queden asientos.
- Téc: (1) `history.pushState({step})` en cada avance, listener `popstate` → `setStep`, y que el chevron de cabecera use `history.back()` (BookingFlow y TripsFlow). (2) Subir el borrador de DetailsStep a los Flows (`BookingSteps.tsx:254-262`). SeatsStep con prop `initial` (`TripsSteps.tsx:157-162`, `TripsFlow.tsx:211` `initial={seatsData}`). (3) En `bounceToList` (`TripsFlow.tsx:110-135,160`), si `seats_left > 0`, mostrar el toast "Quedan menos asientos — ajusta la cantidad" y `setStep("seats")` conservando los datos. Leer `seats_left` del 409 en `services/public-trips.service.ts`.
- Verificar: en Galaxy S5 hacer Atrás en cada paso y volver al anterior con todo lo escrito; la carrera por los últimos asientos deja al pasajero en el paso de asientos con sus nombres.

**P0-12 · ✅ HECHO 2026-10-06 (`hooks/useBackToClose.ts` en Sheet y Drawer + `components/NativeBackButton.tsx` con `@capacitor/app`; el botón físico se verifica en el próximo build nativo) · M03+G10 · En el panel, Atrás cierra la pantalla (o la app nativa) en vez de cerrar la hoja: se pierde el turno o la reserva a medio cargar**
- Quién: el dueño cargando un turno o una reserva telefónica.
- Téc: hook `useBackToClose(open,onClose)` en `components/ui/sheet.tsx` y `components/Drawer.tsx`: `pushState({tfSheet:true})` al abrir; `popstate` → `onClose`; al cerrar por X u overlay, `history.back()` si `history.state?.tfSheet`. **Dependencia nueva `@capacitor/app@^8` (decisión D-07)**. En `hooks/useCapacitor.ts`, `App.addListener('backButton', …)`: cierra el overlay superior, si no `history.back()` cuando `canGoBack`, si no `App.minimizeApp()`.
- Verificar: con la hoja "Nuevo turno" a medio llenar, Atrás la cierra y la pantalla de Turnos sigue ahí. En la APK, Atrás desde Viajes vuelve a Inicio.

**P0-13 · ✅ HECHO 2026-10-06 (migración 051, registro con La Habana por defecto, turnos guardan la zona del negocio, "hoy" local en salidas, plazo del anticipo con la zona de la salida; "Organización test" pasada a America/Havana; todos los negocios pasados a America/Havana, Roberto confirmó que todos están en Cuba). Pendiente menor: (7) reportes con la zona del negocio, pasado a P2 · F10+F11+F12+F13+M30+G43 · Zonas horarias en UTC: "hoy", recordatorios, salidas nocturnas y plazos de anticipo corridos 4-5 h**
- Quién: clientes (desde las 20:00 "hoy" pasa a ser mañana; recordatorio de 1 h a las 03:45), dueños de guaguas (la salida de esta noche desaparece de la lista) y pasajeros (el WhatsApp les da 4 h más para pagar el anticipo).
- Téc: (1) **Datos**: `organizations.timezone='America/Havana'` en las orgs cubanas (incluida `organizacion-test`) y en sus `trips.timezone`. (2) `app/register/page.tsx:12-20,57`: agregar America/Havana y usar como valor por defecto `Intl…resolvedOptions().timeZone` (respaldo Havana). Placeholder cubano en `:287`. `app/dashboard/organizations/new/page.tsx:48`: igual. `self-signup/index.ts:78`. (3) `services/appointments.service.ts:213`: guardar la zona de la organización, no la del navegador. (4) `services/trips.service.ts:168` y `app/dashboard/trips/page.tsx:36` → `getLocalDateString()`. (5) Migración: `wa_appointments_in_window` con `JOIN organizations o … (a.appointment_date+a.start_time) AT TIME ZONE COALESCE(o.timezone,'UTC')` (`014:267`); borrar el fallback de `send-reminders/index.ts:106-121`. (6) `wa-trip-send/index.ts:182,320`: leer `timezone` y pasar `timeZone` a `toLocaleString`. (7) `022_analytics_functions.sql:98,118`: `(c.created_at AT TIME ZONE v_tz)::date`.
- Verificar: a las 21:00 de La Habana, `/book` muestra "Hoy" correcto y la salida de las 22:00 sigue en la lista; un turno a las 09:00 tiene su recordatorio de 1 h a las 08:00 locales.

**P0-14 · ✅ HECHO 2026-10-06 (migración 052: la moneda del servicio sigue siempre a la del negocio, por trigger; Ajustes monta la tarjeta de moneda cuando ya cargó la real) · F14+M29+F15+M14 · Precios en US$ en la página pública y Ajustes que ofrece pasar el negocio a USD**
- Quién: el cliente (lee un precio unas 300 veces mayor) y el dueño (un toque en "Guardar" relabela todo en USD).
- Téc: migración: `public_booking_info` devuelve `organization.currency` y backfill `UPDATE services s SET currency=o.currency FROM organizations o WHERE …` (`029:337`). `components/booking/BookingSteps.tsx:64` usar la moneda de la organización; `components/services/ServiceCard.tsx:51` → `useMoney().format`; `services/services.service.ts:104` guardar la moneda de la organización. `app/dashboard/settings/page.tsx:186`: `{organizationId && !modulesLoading && <CurrencyCard key={modules.currency} …/>}`.
- Verificar: "Masaje" muestra CUP en /book y en Servicios; al recargar Ajustes de golpe se ve "Peso cubano (CUP)" y Guardar está deshabilitado.

**P0-15 · ✅ HECHO 2026-10-06 (migración 053: guardas de cupo con el mismo advisory lock que la reserva web; `capacityError()` traduce los mensajes) · F24 · Se puede sobrevender una salida desde el panel**
- Quién: dueño de guaguas y pasajeros (más gente que asientos en el ómnibus).
- Téc: migración: trigger BEFORE UPDATE OF total_seats en `trips` (`seats_below_taken`) y BEFORE INSERT/UPDATE en `trip_bookings` para `source<>'web'` con `pg_advisory_xact_lock(hashtextextended('trip_booking:'||trip_id,0))` (`no_seats_left`). Mapear los mensajes en `TripService.update` y `createManual`. `ManualBookingSheet.tsx:181` → `max={trip.seats_left}` y deshabilitar el envío si es 0.
- Verificar: bajar el cupo por debajo de lo vendido da "Ya hay N asientos reservados"; una reserva manual en una salida llena se rechaza.

**P0-16 · ✅ HECHO 2026-10-06 (`pickupPointSchema` + cada escritura de paradas revisa su error; si fallan al crear o duplicar, la salida se borra) · F22+F59+M45 · Los puntos de recogida (con precio y anticipo) se pierden sin aviso y la app dice "Salida creada/actualizada"**
- Quién: dueño de guaguas (cree que el precio está publicado y no lo está) y pasajeros (salida sin paradas).
- Téc: `services/trips.service.ts:236-279` `savePickupPoints`: revisar `{error}` en el select, el delete y cada update/insert y hacer `throw`; insertar en bloque (`.insert(rows)`) y en paralelo (`Promise.all`). Validar antes `deposit_per_seat <= price_per_seat` por punto con un schema Zod en `schemas/trip.schema.ts`. Hacer lo mismo en `copyPickupPoints:296`. Si falla al crear, despublicar la salida. Opcional: RPC transaccional `save_trip_pickup_points`.
- Verificar: un punto con anticipo mayor que el precio da un error claro; cortar la red a mitad no muestra "creada".

**P0-17 · ✅ HECHO 2026-10-06 (migración 054 + `utils/phone.ts` + `phoneToChatId`: una sola regla; +53 por defecto; teléfonos guardados normalizados a "+53…"; /book exige móvil cubano de 8 dígitos que empiece por 5). Pendiente menor (d) resuelto el 2026-10-06 (migración 059: las RPC de reserva prefieren la ficha activa) · F19+F48+G07 · Teléfonos mal normalizados: WhatsApp a Argentina o EE. UU., clientes duplicados, reservas asignadas a fichas inactivas**
- Quién: clientes (no les llega la confirmación) y dueños (historial partido).
- Téc: (a) `schemas/customer.schema.ts:56`, `services/customers.service.ts:97`, placeholders `AppointmentModal.tsx:148`, `CustomerFormModal.tsx:71,80`: "+53". En `trip-bookings.service.ts:174-184` pasar `phone_country_code:"+53"`. (b) `booking_phone_key` (`029:37-52`) y `_shared/openwa.ts:42-53`: tratar como internacional solo lo que empieza por `+`/`00`, o `num.startsWith(cc) && num.length > 8` (los dos lugares a la vez, en una migración nueva). (c) Duplicados por clave normalizada en `customers.service.ts:76-81,150-165` y `trip-bookings.service.ts:167`, con `.limit(1).maybeSingle()`. (d) RPC de reserva: `ORDER BY c.is_active DESC, c.created_at DESC` (`029:494-500`, `042:228-233`). (e) Schema público `schemas/public-booking.schema.ts:9-21`: permitir `+`, quitar el código repetido y el 0 inicial, y para CU exigir `/^5\d{7}$/`. (f) Migración de datos solo en las orgs piloto.
- Verificar: "53 52564206", "+5352564206" y "52564206" terminan en la misma ficha y el `chat_id` es `5352564206@c.us`.

**P0-18 · ✅ HECHO 2026-10-06, pendiente la prueba real desde el teléfono (clasificador sin "NO"/"REAGENDAR" por prefijo y con negaciones; respuesta a un mensaje de viaje no toca turnos; con varios turnos, "CANCELAR" sin número manda la lista `clarify_which` (migración 055) y "CANCELAR T-0045" cancela ese) · G08+G09+G14 · Responder por WhatsApp cancela el turno equivocado**
- Quién: clientes (pierden su turno sin querer) y dueños (hueco liberado por error).
- Qué pasa: "No hay problema, allí estaré" o "Reagendar" cancelan; responder a un WhatsApp de viaje cancela el turno de peluquería; con dos turnos se cancela el último que recibió mensaje, no el que se contesta.
- Téc: `supabase/functions/wa-inbound/index.ts`: (1) `classifyReply` (`:592-611`): sacar `NO` y `REAGENDAR` del prefijo de CANCEL; cancelar solo con el mensaje completo "NO"/"CANCELAR" o con el token CANCELAR/CANCELO/ANULAR; si hay negación después de SI/OK, devolver null (sale la aclaración). (2) Antes de la consulta (`~:262`), leer el último saliente sin filtro de intent: si tiene `trip_booking_id`, no tocar turnos. Agregar `.not('appointment_id','is',null)`. (3) Si hay más de un turno abierto y la respuesta es cancelar, no aplicarla y mandar una aclaración con los números (después, si OpenWA envía `quotedMsg`, usarlo).
- Verificar: con el clasificador en Node, "No hay problema, allí estaré" da null; un CANCELAR a un mensaje de viaje no cambia ningún turno.

**P0-19 · ✅ HECHO 2026-10-06 (migración 051 + wa-send: solo confirmados pasan a "reminded"; el dedup cuenta también los "failed" por el 500 de OpenWA) · G36+F87 · El recordatorio "Mañana te esperamos" sale a solicitudes no aprobadas y las pasa a 'reminded' sin aprobar; el de 1 h nunca sale**
- Quién: clientes (creen que está confirmado) y dueños (desaparece el botón Aprobar).
- Téc: migración: `wa_appointments_in_window` con `status IN ('confirmed','reminded','client_confirmed')`, sin `pending` y sin `reminder_sent_at IS NULL` (la deduplicación por intent ya está en `wa-send:139-163`). Se combina con P0-13 (5). `send-reminders/index.ts:116` lo mismo. `wa-send/index.ts:261-274`: `reminder_sent_at` para todos los estados y `status='reminded'` solo `.eq('status','confirmed')`. Respetar `business_settings.enable_reminders`.
- Verificar: un turno 'pending' a 24 h no recibe recordatorio y sigue aprobable; un turno confirmado recibe los dos recordatorios.

**P0-20 · F02 · (Pasado a P3-26)** Roberto confirmó el 2026-10-06 que los WhatsApp **sí llegan todos**: el 500 es un error propio del servidor OpenWA que no impide la entrega. Lo que queda (avisos y textos engañosos) está en P3-26.

**P0-21 · ✅ HECHO 2026-10-06 (migración 058: FKs de auditoría `ON DELETE SET NULL`; `delete-account` valida, borra el usuario y recién después desactiva la org; probado de punta a punta con un usuario desechable) · G05 · "Eliminar cuenta" deja la cuenta a medio borrar (requisito de App Store y Google Play)**
- Quién: cualquier dueño o empleado que haya creado algo (casi todos).
- Téc: migración: FKs `created_by`, `cancelled_by` y `approved_by` → `ON DELETE SET NULL` (`010:268,316,329,363,459`, `033:125,160,162`). `supabase/functions/delete-account/index.ts:73-118`: validar primero (contando solo los miembros con `is_active=true`), luego `auth.admin.deleteUser` y recién después desactivar la org. Mensaje genérico en español. Cambiar el texto del 409 ("transferir la propiedad" no existe).
- Verificar: un usuario con turnos se borra entero y no puede volver a iniciar sesión.

**P0-22 · ✅ HECHO 2026-10-06 (`auth-context` con `connectionError`/`retry`, `ProtectedRoute` solo redirige sin sesión, login salta al panel, `useOrganizationModules().ready`; también la tarjeta de moneda de Ajustes; probado con Playwright con sesión real) · M01+F05+F27+G12 · Con red mala o lenta, el dueño queda atascado en el login o ve "Sin organización asignada"**
- Quién: todos los dueños en Cuba, a diario (el token dura 1 h, así que pasa casi en cada apertura en frío).
- Qué pasa: un fallo de red se trata como "no hay sesión" o "no hay perfil". Con el timeout de 10 s mandan al dueño a /login y ahí se queda aunque la sesión se renueve sola; o ve "Sin organización asignada", "Módulo no disponible", la moneda en USD o "Sin servicios" (con riesgo de crearlos duplicados).
- Téc: `contexts/auth-context.tsx:89-103`: si el error no es PGRST116, conservar el perfil anterior y no hacer `setProfile(null)`; reintentar en `online`/`visibilitychange`. `:125-130`: quitar `AUTH_TIMEOUT_MS`. `:147-157`: si `isAuthRetryableFetchError(error)`, no cerrar sesión. `components/protected-route.tsx:79`: redirigir solo con `!loading && !user`; el timer de 15 s muestra "Conectando… / Reintentar". `app/login/page.tsx`: `useEffect(() => { if (user) router.replace('/dashboard') }, [user])`. `hooks/useOrganizationModules.query.ts`: exponer `ready`, y `trips/page.tsx:284` con `moduleOff = ready && !modules.trips`. Páginas: `if (loading || !profile)` → skeleton.
- Verificar: con el token vencido y sin red se ve "Sin conexión"; al volver la red entra al panel solo, sin teclear la contraseña.

**P0-23 · ✅ HECHO EN CÓDIGO 2026-10-06 (`minWebViewVersion: 111` + `public/webview-update.html`); falta medir el WebView en los teléfonos reales y probar en la APK · M02+G11 · App nativa en Android con WebView viejo (normal en Cuba): pantalla sin estilos y sin aviso (a medir)**
- Quién: dueños con Android 7-12 sin Play Store.
- Téc: `capacitor.config.ts`: `android: { minWebViewVersion: 111 }` y `server.errorPath: "webview-update.html"`. Crear `public/webview-update.html` con estilos inline: "Actualiza Android System WebView (Apklis/Aptoide) para usar Turno Flash". **Antes del piloto, medir la versión del WebView en los teléfonos reales**. Si muchos están por debajo de 99, valorar un polyfill de `@layer` (decisión D-08).
- Verificar: en un emulador con WebView viejo aparece la página de aviso en lugar de HTML sin estilo.

**P0-24 · ✅ HECHO 2026-10-06 (`SUPPORT_WHATSAPP_URL` a +5352564206 en `config/constants.ts`, `SupportWhatsAppLink`; Google Play solo si hay planes; "Suscripción" en el Drawer) · F29+G21+M47+F76 · Al vencer el trial no hay forma de pagar desde Cuba y la pantalla dice "Verifica la configuración del offering en RevenueCat"**
- Quién: todo dueño del piloto, unos 14 días después de registrarse (7 de trial + 7 de gracia).
- Téc: solo texto y enlace. Constante `SUPPORT_WHATSAPP_URL` en `config/`. `app/dashboard/subscription/page.tsx:146-157,207-213`: "Para activar o renovar tu licencia, escríbenos por WhatsApp" con el enlace wa.me; la línea de Google Play solo en Android con offerings. `components/license-gate.tsx:72-79` y `license-notification.tsx:122,190`: el mismo contacto. `components/Drawer.tsx`: agregar "Suscripción" (está en el Sidebar pero no en móvil). Mientras tanto, el admin extiende las licencias a mano en `/dashboard/organizations/details`.
- Verificar: con la licencia vencida en un iPhone, el dueño ve el botón de WhatsApp a soporte.

### P1 — Fricción en los dos flujos clave + datos desactualizados

**P1-01 · ✅ HECHO 2026-10-06 (barras con print:hidden propio) · M04 · La barra de pestañas y la barra superior del panel no quedan fijas en el móvil**
- Quién: todo dueño en el teléfono (para cambiar de sección hay que bajar hasta el final de la lista).
- Téc: `app/dashboard/layout.tsx:35-46`: quitar los dos `<div className="print:hidden">` envoltorios y poner `print:hidden` en `MobileTopbar.tsx:28` y `MobileTabBar.tsx:82`.
- Verificar: en Pixel 7 la barra inferior está visible con scroll a mitad de Turnos.

**P1-02 · ✅ HECHO 2026-10-06 (useCreateParam + max-sm:hidden + sin FAB duplicado) · M05+M58 · El '+' central y "Nuevo turno" de Inicio no abren el formulario; hay tres botones de crear y el FAB tapa contenido**
- Téc: `app/dashboard/appointments/page.tsx`: un efecto que lea `?create=1`, llame a `handleCreate()` y haga `router.replace`. `MobileTabBar.tsx`: el destino según la ruta (en Viajes, nueva salida). Bug de clases: `components/ui/button.tsx:61-66` no fusiona clases, así que `hidden sm:inline-flex` no oculta. Cambiar a `max-sm:hidden` en las 9 llamadas (trips/page.tsx:326, trips/details:404, appointments:635, customers:289, staff:272, services:231, organizations:208, reminders:252, dashboard/page.tsx:461). Esto también arregla M61, M68 y F103 (CTA duplicado).
- Verificar: tocar el '+' abre "Nuevo turno" en un toque; en móvil queda un solo botón de crear por pantalla.

**P1-03 · ✅ HECHO 2026-10-06 (migración 062 + intent rescheduled + hoja Mover turno) · F18+M17 · No se puede reprogramar un turno**
- Quién: dueño (el cliente llama para cambiar la hora) y cliente (recibe un falso "fue cancelado").
- Téc: `AppointmentService.reschedule(id,{date,startTime,staffId?,serviceId?})` con `checkAvailability(excludeAppointmentId)` y un solo `.update` sin tocar el estado. Hook `useRescheduleAppointment`. Pasar `onEdit` en `app/dashboard/appointments/page.tsx:875-896` reutilizando el formulario. WhatsApp "reschedule_ack" → decisión D-05.
- Verificar: mover un turno de 10:00 a 11:00 no envía WhatsApp de cancelación.

**P1-04 · ✅ HECHO 2026-10-06 (check-in → completar; WhatsApp abre chat) · M15+G26+F17+F89 · Completar un turno exige 5 pasos y un WhatsApp; "Enviar recordatorio" de la fila no envía nada; "WhatsApp" del detalle manda recordatorio y hace retroceder el estado**
- Quién: dueño y personal en el local cuando llega el cliente.
- Téc: `utils/appointment-status.ts:61-71`: confirmed/reminded/client_confirmed → "Hacer check-in" (`checked_in`), checked_in → "Completar". `AppointmentModal.tsx:461-468`: quitar el caso especial `next.to==='reminded'` y agregar un botón secundario "Completar". Fila: `page.tsx:746-750,773-777` → si `to==='reminded'`, `handleSendReminder`. Tile WhatsApp (`AppointmentModal.tsx:477-482`): `<a href="https://wa.me/<dígitos>">` y `tel:` en el teléfono (`:418`).
- Verificar: de Confirmado a Completado en 2 toques sin WhatsApp; el tile WhatsApp abre el chat.

**P1-05 · ✅ HECHO 2026-10-06 (ConfirmSheet en cancelar, no vino y cancelar reserva) · F40+F39+M40 · Cancelar turno, "No vino" y cancelar reserva de viaje: un solo toque, sin confirmación y avisan al cliente**
- Téc: `ConfirmSheet` en `app/dashboard/appointments/page.tsx` (estado `pendingTerminal`) y en `trips/details/page.tsx:167-183` (`rejecting`), con el patrón de `trips/page.tsx:442-456`. Texto: "El horario queda libre y le avisamos al cliente por WhatsApp. No se puede deshacer." "No vino" no se ofrece en turnos futuros. `PassengerRow.tsx:170`: el chip de anticipo solo si está pagado (para que se vea lo que hay que devolver).
- Verificar: tocar Cancelar abre una confirmación.

**P1-06 · ✅ HECHO 2026-10-06 (lo cargado por el negocio nace confirmado) · F55+M57 · Lo que carga el propio dueño queda "pendiente" y manda dos WhatsApp**
- Téc: `services/trip-bookings.service.ts:200` → `status:"confirmed"` (quitar el param `requiresApproval`, `trips/details/page.tsx:229`, `useTripBookings.query.ts:134`). `services/appointments.service.ts:200-203` → `data.status || CONFIRMED`.
- Verificar: una reserva telefónica nace confirmada, con un solo WhatsApp.

**P1-07 · ✅ HECHO 2026-10-06 (grid-cols-1 y truncados) · M12+F58+M26+F103+M27 · Listas del panel más anchas que la pantalla (Viajes 480 px; Organizaciones, Usuarios, Reportes)**
- Quién: dueño de guaguas (precio cortado, ⋮ fuera de la pantalla) y admin.
- Téc: `grid-cols-1` en `trips/page.tsx:383,394`, `organizations/page.tsx:244`, `users/page.tsx:271`, `organizations/details/page.tsx:613`, `reports/page.tsx:~261,~304` (y revisar services:284, staff:325). `min-w-0` en `TripCard.tsx:117,128`, `OrganizationCard.tsx:76`, `UserCard.tsx:210`. `TripCard.tsx:149` `<RichText>` para el punto de encuentro. `trips/page.tsx:312` `pb-40 sm:pb-24`. Heatmap `widgets.tsx:141-166`: `minmax(1.25rem,2rem)` y `w-max`.
- Verificar: `scrollWidth == innerWidth` a 320/360/390 en esas rutas.

**P1-08 · ✅ HECHO 2026-10-06 (tarjeta entera clicable) · M38 · A la salida solo se entra por un enlace de 16 px**
- Téc: `TripCard.tsx:188` → `after:absolute after:inset-0 after:content-['']`; el kebab en `relative z-10`.
- Verificar: tocar en cualquier parte de la tarjeta abre el detalle.

**P1-09 · ✅ HECHO 2026-10-06 (dvh + SheetFooter + bloqueo de scroll + Más opciones) · M13+M24+M25 · En las hojas del panel el botón "Crear salida"/"Cargar reserva" queda cortado; el teclado lo tapa; el fondo se desplaza**
- Téc: `components/ui/sheet.tsx:58` `flex flex-col max-h-[85dvh]`; `:90` `min-h-0 flex-1 overscroll-contain`; prop `footer` sticky para los botones (TripFormSheet, AppointmentModal); bloquear el scroll del `body` en el efecto `:35`; `touch-none` en el overlay `:51`. Agrupar los opcionales de "Nueva salida" en un desplegable.
- Verificar: en iPhone SE, con el teclado al 55%, "Crear salida" sigue visible.

**P1-10 · ✅ HECHO 2026-10-06 (regla global 16 px, zoom permitido, 44 px) · M22+M23 · Inputs de 14 px (zoom en iOS), zoom bloqueado y botones de 36 px**
- Téc: `sheet.tsx:126` `text-base sm:text-sm` (también en el login y los buscadores); etiquetas `:113,118` a `text-xs`; `app/layout.tsx:100-101` quitar `maximumScale`/`userScalable`. CTAs públicos `size="lg"`; `BookingFlow.tsx:267` Volver `h-11 w-11`; cierre de hoja y kebab `min-h-11 min-w-11`.
- Verificar: el barrido automático no encuentra controles < 44 px ni inputs < 16 px en /book, /trips y Nuevo turno.

**P1-11 · ✅ HECHO 2026-10-06 (CustomerPicker + migración 063 + keepPreviousData) · F45+M42+G29+M18 · Elegir o buscar un cliente: select sin búsqueda, búsqueda que no encuentra parciales y teclado que se cierra**
- Téc: `AppointmentModal.tsx:87-100`: input `type="search" inputMode="tel"` que filtra `customers` por dígitos o nombre; si no hay resultado, alta rápida con el teléfono precargado. Migración `search_customers_fulltext` (después de P0-01): ILIKE siempre + coincidencia por dígitos normalizados. `hooks/useCustomers.query.ts` `placeholderData: keepPreviousData`; `customers/page.tsx:230` spinner solo en la primera carga.
- Verificar: escribir "5256" encuentra a Client Two sin perder el foco.

**P1-12 · ✅ HECHO 2026-10-06 (realtime de pasajes, re-suscripción, sin turno optimista) · F23+F81+F42+F43 · Datos desactualizados en el panel**
- Qué pasa: la lista de pasajeros no se actualiza cuando entra una reserva web; al reconectar el websocket no se recuperan los cambios; el turno optimista aparece como "Sin nombre · 0 min"; el filtro de la Lista se aplica sin verse en la vista Día.
- Téc: `hooks/useRealtimeEntities.ts:105-110` `invalidateKeys:[tripKeys.all, tripBookingKeys.all]`. `hooks/useRealtimeTable.ts:98` callback de `subscribe` que invalida en el re-SUBSCRIBED. `hooks/useAppointments.query.ts:241-271` completar desde las cachés y agregar solo en las listas cuyo rango coincide (o quitar el insert optimista). `appointments/page.tsx:814` `appointments={appointments}`.
- Verificar: una reserva web aparece en el detalle de la salida abierta en menos de 5 s.

**P1-13 · ✅ HECHO 2026-10-06 (bookingPending en fila, filas 0 = error, licencia en visibilitychange) · F25+F52+M41+G06 · Montos pendientes incorrectos o "Cobro registrado" sin guardar**
- Téc: `PassengerRow.tsx:87-88` → `bookingTotal`/`bookingPending`. `trips/details/page.tsx:461` agregar `|| owed > 0`. En los UPDATE de `trip-bookings.service.ts:55-118`, `trips.service.ts:379-406` y `appointments.service.ts:307`: `.select('id')` y error si vuelven 0 filas. `useLicense` revalida en `visibilitychange`.
- Verificar: con un extra de 1000, la fila y el chip muestran el mismo "Falta"; con la licencia vencida a mitad de sesión aparece un error y no "Cobro registrado".

**P1-14 · ✅ HECHO 2026-10-06 (migración 064) · F57 · Una salida cancelada sigue aceptando reservas manuales y sus reservas cuentan para el límite por teléfono**
- Téc: migración: `AND tr.cancelled_at IS NULL` en el conteo de `create_trip_booking` (`042:~215`) + `RAISE 'trip_cancelled'` en el trigger BEFORE INSERT (039). `trips/details/page.tsx`: banner "Salida cancelada" y ocultar "Cargar reserva".
- Verificar: después de cancelar la salida, el pasajero puede reservar otra.

**P1-15 · ✅ HECHO 2026-10-06 (chip por aprobar + atajo de Inicio) · F31 · Las reservas por aprobar no se ven en la lista ni en Inicio**
- Téc: `trips.service.ts:195-202` seleccionar `status`, contar `pending_approval`; `TripCard.tsx:166` chip "{n} por aprobar" con enlace; subtítulo del atajo Viajes en Inicio (consulta head-count).
- Verificar: una reserva web pendiente muestra el chip en la tarjeta.

**P1-16 · ✅ HECHO 2026-10-06 (columna Recogida + Compartir lista (@capacitor/share)) · F56+M39+G23 · La hoja del chofer no dice dónde se recoge a cada pasajero y no se puede compartir por WhatsApp; CSV e Imprimir no hacen nada en la app nativa**
- Téc: `trips/details/page.tsx:249-312`: agregar la columna "Recogida" (nombre + hora), ordenar por parada, formatear la fecha y usar RichText (`PassengerPrintSheet.tsx:58,71`). Botón "Compartir lista": texto plano → `navigator.share({text})` con respaldo `wa.me/?text=` y portapapeles. En nativo, ocultar CSV e Imprimir hasta decidir sobre `@capacitor/filesystem`/`share` (D-07).
- Verificar: la lista llega como texto a un chat de WhatsApp desde la APK.

**P1-17 · ✅ HECHO 2026-10-06 (caché de listas o Sin conexión) · F34 · Sin red, abrir una salida dice "No encontramos esa salida"**
- Téc: `trips/details/page.tsx:82-90`: usar primero la caché de `useTripsQuery()` (la misma clave que la lista) y leer `error`; si falló, mostrar "Sin conexión" con Reintentar (`:344`). Se completa con P2-01 (persistencia).
- Verificar: abrir una salida sin red después de ver la lista muestra los datos o "Sin conexión", nunca "no existe".

**P1-18 · ✅ HECHO 2026-10-06 (hueco tomado fuera de caché + Comprobando disponibilidad) · M09+M35+F62 · Tras "Horario ocupado" se sigue ofreciendo la misma hora; "Continuar" no da señal durante 4,6 s**
- Téc: `BookingFlow.tsx` rama `slot_taken`: `setQueryData` que quita el hueco de `publicBookingKeys.slots(...)`. `TripsFlow.tsx:116-138` estado `checkingSeats` → `SeatsStep busy`, botón "Comprobando disponibilidad…" deshabilitado (`TripsSteps.tsx:361`).
- Verificar: el hueco tomado desaparece; un doble toque en Continuar no lanza dos pedidos.

**P1-19 · ✅ HECHO 2026-10-06 (defaultName) · M33+F100 · En viajes el pasajero escribe su nombre dos veces**
- Téc: `BookingSteps.tsx` DetailsStep prop `defaultName`; `TripsFlow.tsx:217` `defaultName={seatsData?.passengerNames[0]}`; `autoComplete="name"` en los nombres de pasajero.
- Verificar: con 1 asiento, "Tus datos" llega precargado.

**P1-20 · ✅ HECHO 2026-10-06 (code ?? error) · F21 · Un slug inexistente o una página apagada dice "Revisa tu conexión"**
- Téc: `services/public-trips.service.ts:53` → `(data?.code ?? data?.error)`; o normalizar en `public-trips/index.ts:121-127`.
- Verificar: `/trips?b=no-existe` dice "no está recibiendo reservas".

**P1-21 · ✅ HECHO 2026-10-06 (sin cancelados + fecha en visibilitychange) · G31 · El contador "Hoy" de Inicio suma los cancelados**
- Téc: `app/dashboard/page.tsx:334` filtrar `cancelled` y `no_show`; recalcular `todayString` en `visibilitychange` (`:326`).
- Verificar: un día con 9 cancelados y 2 completados muestra 2.

**P1-22 · ✅ HECHO 2026-10-06 (nickname vacío → nombre) · F46+M62(chip) · El profesional sin apodo aparece como un chip vacío**
- Téc: `AppointmentModal.tsx:273` `s.nickname?.trim() || nombre completo`; guardar null en `staff/page.tsx`.
- Verificar: un profesional sin apodo muestra su nombre.

**P1-23 · ✅ HECHO 2026-10-06 (--safe-area-inset-* y body:has(barras)) · M48+G24 · Safe area doble en iPhone con notch y nula en Android 15+**
- Téc: `globals.css:194-201` body con `var(--safe-area-inset-*)`; quitar el `env()` de `MobileTopbar.tsx:30` y `MobileTabBar.tsx:84`; `sheet.tsx:59` y `Drawer.tsx:250-251` → `var(--safe-area-inset-*, 0px)`.
- Verificar: en iPhone 13 no queda una franja vacía de 47 px; en Android 15 la barra no queda bajo la barra de estado.

**P1-24 · ✅ HECHO 2026-10-06 (getSiteUrl()) · M49+G19 · Una invitación enviada desde la app nativa lleva a https://localhost**
- Téc: `services/invitations.service.ts:71` → `${getSiteUrl()}/auth/callback?type=invite`; revisar la allowlist de Supabase Auth.
- Verificar: el email de invitación apunta al dominio público.

**P1-25 · ✅ HECHO 2026-10-06 (sesión nativa en @capacitor/preferences) · M20+G41 · Sesión en cookies: en la app iOS puede no persistir (y en Android, un cierre brusco puede perder el token renovado)**
- Téc: `utils/supabase/client.ts`: en nativo, `createClient` de supabase-js con `storage: window.localStorage` (o `@capacitor/preferences`, D-07), `persistSession`, `flowType:"pkce"`, singleton. La web sigue igual.
- Verificar: en un iPhone físico, cerrar y abrir la app conserva la sesión.

**P1-26 · PENDIENTE: necesita una Mac (Android ya sincronizado, `3a7c7c7`) · M19 · El proyecto iOS no compila tal como está en el repo**
- Téc: en una Mac, `npm run cap:sync:ios`; verificar las rutas POSIX en `ios/App/CapApp-SPM/Package.swift` y la entrada de RevenueCat; commitear. También `npm run cap:sync:android` (los assets son de junio). Solo si el piloto incluye iPhone nativo (D-09).
- Verificar: build de Xcode limpio.

**P1-27 · ✅ HECHO 2026-10-06 (migración 065 + logger) · F26+F64+F65+G40+F83(stats) · El registro de errores está roto: no vas a ver los fallos del piloto**
- Téc: migración: `increment_error_count()` con variable local (`011_error_logging.sql:48-63`); políticas de admin y owner separadas (`:89-131`); `get_error_stats` con chequeo de admin y `REVOKE … FROM anon, PUBLIC` (`:138`); REVOKE de `cleanup_wa_processed_events`, `wa_appointments_in_window` y `generate_appointment_number` a anon; INSERT `WITH CHECK (user_id=auth.uid() AND org propia)` (`:83`). `app/dashboard/page.tsx:233` `enabled: isAdmin`. `utils/logger.ts`: no enviar sin red, `getSession()` en vez de `getUser()`, dedup de 60 s; quitar el doble log de `query-client-provider.tsx:33-37`.
- Verificar: un error forzado aparece en /dashboard/errors para el admin.

**P1-28 · ✅ HECHO 2026-10-06 (/forgot-password con flujo implícito) · F28 · No existe "¿Olvidaste tu contraseña?"**
- Téc: enlace en `app/login/page.tsx` → `app/forgot-password/page.tsx` (`resetPasswordForEmail`, mensaje neutro). `app/auth/callback/page.tsx:118` agregar `type==='recovery'` → `/auth/setup-password`. Allowlist de redirect. Comprobar el SMTP (límites del de Supabase).
- Verificar: llega el email y permite poner una contraseña nueva.

**P1-29 · ✅ HECHO 2026-10-06 (honeypot + 10 negocios/hora) · F77 · El registro self-service no tiene anti-abuso**
- Téc: honeypot en `app/register/page.tsx` y en `self-signup`; límite de N orgs por hora (o tabla por IP con RLS) con 429; throttle del WhatsApp al admin (`self-signup/index.ts:186-220`). Verificar email → D-06.
- Verificar: una ráfaga de 20 registros recibe 429 a partir del N.

**P1-30 · ✅ HECHO 2026-10-06 (mensajes en español) · F67 · El login muestra "Invalid login credentials" en inglés y "Bienvenida"**
- Téc: `app/login/page.tsx:33` mapear `invalid_credentials`/`email_not_confirmed`; `:66` "Hola de nuevo"; `:69` texto neutro.
- Verificar: con una contraseña mala sale "Email o contraseña incorrectos."

**P1-31 · ✅ HECHO 2026-10-06 (abre Horario y servicios) · F74 · Un profesional sin horario ni servicios aparece "Online sí"**
- Téc: `app/dashboard/staff/page.tsx:137-145` al crear, abrir el editor de horario (`setScheduleStaff(created)`) con un toast que lo explique.
- Verificar: después de crear un profesional se abre "Horario y servicios".

**P1-32 · ✅ HECHO 2026-10-06 (keepPreviousData + Actualizando…) · F44+M43 · Cambiar de día o vista reemplaza toda la pantalla por un spinner**
- Téc: `hooks/useAppointments.query.ts:~638` `placeholderData: keepPreviousData`; indicador pequeño con `isFetching`. Lo mismo en el detalle de la salida.
- Verificar: cambiar Día→Semana deja los controles visibles.

**P1-33 · ✅ HECHO 2026-10-06 (ConfirmSheet + chequeo de staff_exceptions) · G32 · Cerrar un día con turnos ya reservados no avisa y el panel deja crear turnos ese día**
- Téc: `ExceptionsEditor.tsx:48-72` contar los turnos vivos del rango y pedir confirmación; `appointments.service.ts:391` reemplazar el TODO por un chequeo de `staff_exceptions`; `confirm()` antes de borrar el cierre.
- Verificar: agregar un cierre con 1 turno muestra "Hay 1 turno ese día".

### P2 — Rendimiento, consumo de datos, offline y caché

**P2-01 · ✅ HECHO 2026-10-06 (persistencia en localStorage con lista blanca, sesión y perfil guardados para abrir sin señal, aviso "Sin conexión"; mutaciones siguen `always` para no encolar escrituras; sin service worker ni guard de enlaces web por D-02) · F35+F33 · TanStack configurado para red buena: nada sobrevive sin conexión** → ver la sección 3. Téc: `contexts/query-client-provider.tsx:16-31`: `networkMode:"offlineFirst"`, `retry:2`, `gcTime:24h`; mutaciones `networkMode:"online"` + banner con `onlineManager`. Persistencia → D-01. Web/PWA: guard `navigator.onLine` en los enlaces de `Sidebar`/`MobileTabBar` (toast "Sin conexión") en vez de dejar la página en blanco; un service worker solo con aprobación (D-02). Verificar: cerrar y abrir sin red muestra la agenda del día.

**P2-02 · ✅ HECHO 2026-10-06 (grupo `app/(app)/` con el AuthProvider, ErrorBoundary carga supabase solo al fallar, Zod con `import()` en "Tus datos", texto estático en el fallback; /book: JS 256→157 KB y total 325→226 KB con brotli; queda la fuente Inter, 47 KB) · F50+M11 · Página pública de 440 KB y 1,3 MB de JS: en 3G, 8-37 s hasta ver algo**
- Téc: (a) importar `useToast` desde `@/hooks/useToast` y no desde el barril `@/hooks` en `BookingFlow.tsx:12`, `TripsFlow.tsx:14` (saca Capacitor y los servicios del panel). (b) Route group `app/(public)/` para book y trips con un layout mínimo, sin `AuthProvider`. (c) Una sola fuente (sin JetBrains_Mono en el root). (d) URL de la foto armada como string (`TripsFlow.tsx:48`), `loading="lazy"` (`TripsSteps.tsx:83-85`). (e) Fallback de Suspense con texto estático. (f) Opcional `zod/mini`.
- Verificar: /book en frío por debajo de 200 KB y contenido útil en menos de 6 s en regular3g.

**P2-03 · ✅ HECHO 2026-10-06 (Access-Control-Max-Age 86400, funciones desplegadas) · F85 · Cada poll público paga un preflight CORS**
- Téc: `"Access-Control-Max-Age":"86400"` en `public-trips/index.ts:21-25` y `public-booking/index.ts:20-24`.
- Verificar: un solo OPTIONS por sesión.

**P2-04 · ✅ HECHO 2026-10-06 (nombre desde useOrganizationModules, useLicense como useQuery con refetch al volver; Inicio en frío: 5 pedidos) · F83+M44 · El panel repite pedidos al abrir (organización x3-4, licencia x2, stats de admin)**
- Téc: quitar los efectos `organizations.select('name')` de `Sidebar.tsx:212`, `Drawer.tsx:205` y `dashboard/page.tsx:262` → `modules.name`; `useLicense` como `useQuery(['license',orgId])` con un staleTime de minutos.
- Verificar: Inicio en frío pasa de 18 a unos 10 pedidos.

**P2-05 · ✅ HECHO 2026-10-06 (una invalidación por mutación, debounce 500 ms, DELETE ajenos ignorados, sin suscripción global a wa_outbound; crear turno 13→10 pedidos) · F78+F79+F80 · Cada cambio repite peticiones y Realtime trae datos que nadie usa**
- Téc: dejar una sola invalidación (`X.all`) en los `onSettled` de useAppointments/useCustomers/useServices/useStaff (`useAppointments.query.ts:285-286`). Debounce de 500 ms en `useRealtimeTable.ts:90-96`. Quitar `useRealtimeWAOutbound` de `useRealtimeAll` (`useRealtimeEntities.ts:119`). Ignorar los DELETE de otras organizaciones (G39).
- Verificar: crear un turno pasa de 13 a unos 4 pedidos.

**P2-06 · ✅ HECHO 2026-10-06 (clientes solo con el formulario abierto) · F84 · Turnos descarga todos los clientes con `select('*')` y los recarga al volver el foco**
- Téc: `customers.service.ts:245-255` pedir solo las columnas mínimas; opciones `enabled: showCreateModal, refetchOnWindowFocus:false`; con P1-11 queda una búsqueda bajo demanda.
- Verificar: Turnos no pide la lista de clientes hasta que se abre el formulario.

**P2-07 · ✅ HECHO 2026-10-06 (TripService.getById + useTripQuery) · F60 · El detalle de una salida baja todas las salidas de la historia (y la URL acabará dando 414)**
- Téc: `TripService.getById` + `useTripQuery(id)` (`trips/details/page.tsx:82-87`); invalidaciones dirigidas en `useInvalidateBookings`.
- Verificar: abrir el detalle hace 3 GET pequeños que no crecen con la historia.

**P2-08 · ✅ HECHO 2026-10-06 (causa: en Windows los segmentos se escriben en subcarpetas y el cliente los pide con puntos; `scripts/fix-windows-export.mjs` tras `next build`: 15 → 0 respuestas 404 y el menú ya no recarga la página) · F32+M67 · Prefetch de rutas con 404 (~90 KB por carga)**
- Téc: **construir los builds en Linux, macOS o WSL** (causa: el export de Next en Windows). Si se compila en Windows, `prefetch={false}` en los enlaces de `MobileTabBar`, `Sidebar` y `Drawer`.
- Verificar: 0 respuestas 404 de `__next.*.txt`.

**P2-09 · ✅ HECHO 2026-10-06 (WebP 800 px, 69 KB; bg-hero.png borrado; .map solo 116 KB, no se tocó) · F86+M70 · Landing de 1,8 MB en PNG y APK con 1 MB de imagen sin usar**
- Téc: borrar `public/images/bg-hero.png`; convertir `tf-1..3.png` a WebP de ~800 px (`home-client.tsx:487`); quitar `*.map` de `out/` antes de `cap sync`.
- Verificar: landing < 400 KB; APK unos 3 MB más chico.

**P2-10 · ✅ HECHO 2026-10-06 (useSessionState por campo en `booking:<slug>` / `trips:<slug>`, incluida la confirmación; el paso sale de `history.state`) · M08 · Si Android descarta la pestaña al cambiar a WhatsApp, la reserva pública empieza de cero**
- Téc: guardar `{step, serviceId, staffId, date, slot}` / `{step, tripId, seatsData}` + borrador del formulario en `sessionStorage` (`booking:${slug}`) con try/catch; restaurar con inicializadores lazy; borrar al confirmar.
- Verificar: recargar en "Tus datos" vuelve al mismo paso con lo escrito.

**P2-11 · ✅ HECHO 2026-10-06 (salta hasta 3 días vacíos mientras el cliente no elige) · M36+F93 · Se preselecciona "Hoy" aunque no tenga horarios y cada día cuesta 8-10 s en 3G**
- Téc: `BookingSteps.tsx:149-165`: saltar automáticamente hasta 3 días vacíos mientras el cliente no elige; a futuro, `available_dates` en `public_booking_info`.
- Verificar: de noche se preselecciona el primer día con huecos.

**P2-12 · ✅ HECHO 2026-10-06 (nativo → /dashboard) · M50+G25 · La app nativa abre en la landing de marketing aunque haya sesión**
- Téc: `app/home-client.tsx:~245`: si `Capacitor.isNativePlatform()` y auth ya cargó → `router.replace(user ? "/dashboard" : "/login")`.
- Verificar: abrir la APK con sesión entra directo al panel.

**P2-13 · ✅ HECHO 2026-10-06 (cacheControl 1 año; chequeos en paralelo con maybeSingle) · F111+F72 · La foto del vehículo sin caché; crear un servicio o profesional hace 3 pedidos en serie**
- Téc: `trips.service.ts:104` `cacheControl:"31536000"`. `services.service.ts:69-90` y `staff.service.ts:70-93`: `.maybeSingle()` y `Promise.all`.
- Verificar: la foto se sirve desde la caché en la segunda visita.

**P2-14 · ✅ HECHO 2026-10-06 (Activos/Inactivos + Reactivar) · G30 · Desactivar un cliente promete "podrás reactivarlo" pero no hay cómo**
- Téc: toggle "Activos/Inactivos" en `customers/page.tsx:107`, "Reactivar" en `CustomerCard`, texto `:435`.
- Verificar: un cliente desactivado se puede reactivar.

**P2-15 · ✅ HECHO 2026-10-06 (tarjeta "Pon en marcha tu negocio" en Inicio para el dueño: hasta 8 pasos según módulos, foto real de cada pantalla con el botón resaltado, se marcan solos, "Ocultar" por negocio; `?create=1` también en Servicios y Profesionales; "Errores" solo admin) · F30 · Una cuenta nueva no tiene guía de primeros pasos**
- Téc: `app/dashboard/page.tsx:173` "Errores" solo para el admin; tarjeta descartable "Pon en marcha tu negocio" con conteos head-count por módulo.
- Verificar: un dueño nuevo ve los 3 pasos con enlaces.

**P2-16 · ✅ HECHO 2026-10-06 (migración 066 SELECT en storage; 2 fotos QA huérfanas borradas) · F53 · Duplicar una salida pierde la foto y borrar la foto falla en silencio**
- Téc: migración: política SELECT de `storage.objects` para `trip-photos` limitada a la carpeta de la organización. Borrar el objeto QA que quedó con service role.
- Verificar: la copia conserva la foto.

**P2-17 · ✅ HECHO 2026-10-06 (fecha +7 días, min hoy, botón primario; ConfirmSheet confirmVariant/confirmDisabled) · M46+F98 · Duplicar una salida: botón rojo, fecha vacía, se puede elegir el pasado**
- Téc: `confirm-sheet.tsx` prop `confirmVariant`; precargar `departure_date+7`; `min=hoy`; deshabilitar sin fecha (`trips/page.tsx:268,405-477`).
- Verificar: duplicar en 2 toques con la fecha sugerida.

### P3 — Textos y detalles menores

- **P3-01 · ✅ HECHO 2026-10-08 · F90+M59 · G47 · Voseo**: `CurrencyCard.tsx:78` "cobras"; `reports/page.tsx:158` "Pídele".
- **P3-02 · ✅ HECHO 2026-10-08 («Por la mañana»/«Por la tarde»; «Hoy · miércoles, 8 oct») · F88+M60 · "MAÑANA" dos veces**: `appointments/page.tsx:737,764` "Por la mañana"/"Por la tarde"; fecha junto a Hoy/Mañana (`:950-963`).
- **P3-03 · ✅ HECHO 2026-10-08 (desplegado; `htmlFor` resuelto en `Field` con `useId` para todos los formularios) · F99+M53+M54+M63 · Copy de viajes**: `TripsSteps.tsx:95` `first-letter:uppercase`; `:105` y `TripsFlow.tsx:132` singular "1 asiento"; `BookingSteps.tsx:314` "confirmarte la reserva"; `utils/format.ts:23` `useGrouping:"always"` (también `wa-trip-send:97`, `daily-summary:250`, `widgets.tsx:14`); fecha formateada en `trips/details/page.tsx:392`; placeholder `ManualBookingSheet.tsx:118` "+53 5XXXXXXX"; `htmlFor` en Field (`sheet.tsx:113`).
- **P3-04 · ✅ HECHO 2026-10-08 (`useMoney` en Reportes y en los gráficos; se quitó `formatMoney` de widgets) · G42+M28 · Reportes con "$"**: `useMoney()` en `reports/page.tsx:185,218,337` y en `charts.tsx`.
- **P3-05 · ✅ HECHO 2026-10-08 (`ROLE_META` en Sidebar, Drawer y Mi cuenta; en Inicio `roleLabel` ya no se usaba) · G48+M62(rol)+F76(rol) · Rol "Staff"/"owner" en crudo**: usar `ROLE_META` en `Sidebar.tsx:190`, `Drawer.tsx:181`, `dashboard/page.tsx:194`, `account/page.tsx:113`.
- **P3-06 · ✅ HECHO 2026-10-08 (sin «Confirmar» en reservas confirmadas; CSV oculto en móvil; `pickup_location` ya usaba RichText) · M62 (resto) · Menús**: no ofrecer "Confirmar" en una reserva ya confirmada (`PassengerRow.tsx:108`); RichText en `pickup_location`; CSV visible en móvil.
- **P3-07 · ✅ HECHO 2026-10-08 · M61+M68 · Títulos truncados**: `line-clamp-2` en el h1 del detalle de salida; `break-words` en el saludo (`dashboard/page.tsx:449`); el CTA se resuelve en P1-02.
- **P3-08 · ✅ HECHO 2026-10-08 (migración 067 aplicada: días redondeados hacia arriba y gracia de 7 días exactos; un solo aviso en Inicio; textos «Te quedan N días de acceso», sin distinguir prueba de licencia paga porque la BD no lo guarda; gracia fija en 7, ya no lee la variable de entorno) · F68 · El trial dice "6 días" y "renuévala" con doble aviso**: CEIL en `check_license_status` (nueva migración); un solo aviso (`dashboard/page.tsx:436/475`); texto "Prueba gratis: te quedan N días". Se une con **G44** (gracia real de unos 8 días y "0 días restantes"; quitar `NEXT_PUBLIC_LICENSE_GRACE_PERIOD_DAYS`).
- **P3-09 · ✅ HECHO 2026-10-08 (registro: «Para cambiarlo después, escríbenos por WhatsApp»; FAQ y CTA del landing ya no hablan de invitación; enlace «Pedir conexión de WhatsApp» en Ajustes; el campo `whatsapp_phone` ya estaba en ContactCard) · F69+F70+F71 · Textos de onboarding**: `register/page.tsx:221` "escríbele al soporte"; FAQ `home-client.tsx:235,657`; en Ajustes, contacto "Pedir conexión de WhatsApp" + campo `whatsapp_phone`.
- **P3-10 · ✅ HECHO 2026-10-08 (migración 068: `contact_phone` en los dos payloads públicos; `BusinessContactLink` en el éxito y al llegar al límite) · F95+M55 · Sin contacto del negocio en la página pública**: `whatsapp_phone` en `public_booking_info`/trips info; enlace "Escribir al negocio" en el éxito y en `too_many_bookings`.
- **P3-11 · ✅ HECHO 2026-10-08 (openGraph propio en /book y nuevo `app/trips/layout.tsx`; sin `openGraph.url` en la raíz) · F96+M32 · Vista previa de WhatsApp con marketing para dueños**: openGraph propio en `app/book/layout.tsx` y nuevo `app/trips/layout.tsx`; quitar `openGraph.url` del root.
- **P3-12 · ✅ HECHO 2026-10-08 (`BusinessTimeNote`: compara el reloj del dispositivo con el del negocio, no el nombre de la zona) · F97 · Zona horaria desde el exterior**: nota "Horarios en hora local del negocio" si el dispositivo está en otra zona.
- **P3-13 · ✅ HECHO 2026-10-08 (migración 069: apellido opcional en las dos RPC; se recuerda nombre y teléfono en `localStorage` `turnoflash:customer`; con un solo profesional se salta «¿Con quién?». Desplegado y comprobado desde fuera; el panel tampoco exige apellido) · F94+M37 · Flujo público más corto**: saltar el paso de profesional si hay uno solo (`BookingFlow.tsx:159-180`); apellido opcional; recordar nombre y teléfono en el dispositivo → D-04.
- **P3-14 · ✅ HECHO 2026-10-08 (botón fijo abajo en Tus datos y en asientos; Enter pasa al campo siguiente; probado a 360x640) · M51+M52 · Botón principal bajo el pliegue y Enter que envía**: contenedor sticky para el CTA (`BookingSteps.tsx:383`, `TripsSteps.tsx:361`); `enterKeyHint` + enfocar el siguiente campo.
- **P3-15 · ✅ HECHO 2026-10-08 · M56 · Copiar instrucciones del anticipo**: botón "Copiar instrucciones" (`TripsFlow.tsx:290`).
- **P3-16 · ✅ HECHO 2026-10-08 · F108 · Placeholder del anticipo que parece real**: "Ejemplo: 9200 XXXX…" y aviso si está vacío con la página activa (`TripBookingDetails.tsx:129-133`).
- **P3-17 · ✅ HECHO 2026-10-08 (sin «No vino» en un turno en curso; etiquetas con `getStatusLabel`; el UPDATE exige el estado que se validó) · F41+F37 · "No vino" en un turno en curso y transiciones solo en el cliente**: ocultar el tile (`AppointmentModal.tsx:491`); etiquetas en español (`appointments.service.ts:276`); `.eq('status', actual)` en el UPDATE (`:306`).
- **P3-18 · ✅ HECHO 2026-10-08 salvo `special` (`driver_phone` fuera del payload público, 068; borrar clientes y turnos solo owner/admin, migración 070 RESTRICTIVE; los DELETE ajenos de Realtime ya se filtraban; `special` sigue aparcado por decisión de Roberto) · F63+G13+G38+G39 · Permisos menores**: quitar `driver_phone` de `public_trips_info` (042:348-350); política RESTRICTIVE DELETE solo para owner/admin en customers/appointments; `special` en `canManageAppointments` (`appointments/page.tsx:122`); filtrar los DELETE de Realtime ajenos.
- **P3-19 · ✅ HECHO 2026-10-08 (migración 071: `notify_business_new` solo con `source = web`, lock por organización + índices únicos en la numeración, índice por `booking_phone_key`; guard de módulo en el layout del panel; `z.iso.date()` en `public-booking`, desplegado) · F106+F107+F112+F113+F114 · Backend menor**: `z.iso.date()` (`public-booking/index.ts:49`); guard de módulo en `dashboard/layout.tsx`; `notify_business_new` solo `source='web'` (016); lock por organización + índice único en la numeración; índice `(organization_id, booking_phone_key(...))`.
- **P3-20 · ✅ HECHO 2026-10-08 (desplegado: resumen diario y campañas no salen con licencia vencida u org inactiva; resumen con moneda del negocio y línea de viajes; `wa-inbound` olvida el evento si falla, trata una nota de voz como respuesta ilegible y un 👍 solo como confirmación; migración 072: los eventos SANDBOX de RevenueCat solo se auditan y una compra nunca acorta la licencia (GREATEST); la licencia se revalida tras la compra. **No se hace** el reintento del resumen: OpenWA responde 500 y entrega, reintentar duplicaría. Sin probar con teléfono real) · G15+G16+G20+G34+G35+G37 · WhatsApp y licencia menores**: no enviar resumen ni campañas con la licencia vencida o la org inactiva; RevenueCat (SANDBOX, GREATEST, `verify_jwt=false` en config.toml); revalidar la licencia tras la compra; resumen diario con viajes, moneda y reintento (`status='sent'`); dedup de wa-inbound borrando en el catch; notas de voz → aclaración y 👍 = confirmar.
- **P3-21 · ✅ HECHO 2026-10-08 (confirmación al apagar un módulo; selector de negocio al invitar como admin; Errores en rojo solo si hay sin resolver; Copiar/Compartir solo con la página activa; los avisos «Solo los dueños pueden…» ya eran uniformes y Mi cuenta / LicenseGate no nombran módulos) · F101+F102+F104+F109+G45+G46 · Admin y ajustes menores**: confirmar al apagar un módulo; selector de organización al invitar; KPIs de Plataforma en rojo cuando hay fallos; textos de eliminar cuenta y de LicenseGate neutrales según el módulo; Compartir/Copiar solo con la página activa (`BookingPageDetails.tsx:55-63`); aviso "Solo el dueño puede…" uniforme.
- **P3-22 · ✅ HECHO 2026-10-08 (la Lista filtra estado y texto en el servidor, solo en vista Lista; chip «No vino»; probado con el empleado QA) · F92 · Búsqueda de la Lista solo sobre lo cargado**: chip "No vino" y búsqueda en el servidor.
- **P3-23 · ✅ HECHO 2026-10-08 (en Profesionales el dueño elige la «Cuenta de la app» de cada uno, `staff_members.user_id`; chip «Mis turnos» en la Lista para el empleado vinculado; aviso en Viajes de qué puede hacer; probado con el empleado QA y vínculo deshecho) · G27+G28 · Empleado**: vincular el usuario con su ficha de profesional + filtro "Mis turnos"; aviso de solo lectura en Viajes.
- **P3-24 · ✅ HECHO 2026-10-08 (botón «Actualizar» en la cabecera móvil; el tema solo se guarda si el usuario lo elige; `useCapacitor()` montado en el layout del panel — **probar la barra de estado en la APK**) · M64+M65+M66 · Panel**: botón "Actualizar" en la cabecera móvil; guardar el tema solo cuando el usuario lo elige (`theme-context.tsx:70-76`); montar `useCapacitor()` (barra de estado).
- **P3-25 · ✅ HECHO 2026-10-08 · M69 · 320 px**: `ExceptionsEditor.tsx:119,140` en una columna por debajo de 360 px.
- **P3-26 · ✅ HECHO 2026-10-08 (el envío manual trata `HTTP_500` de OpenWA como enviado y da un mensaje en español para el resto; Plataforma dice «sin confirmar entrega»; `wa-inbound` guarda la alerta por cada dueño, desplegado) · M16+G18 · Avisos engañosos de WhatsApp**: el mensaje sí se entrega aunque OpenWA responda 500 (confirmado por Roberto), pero el envío manual muestra "Internal server error" en inglés y las filas quedan 'failed'. Téc: `services/appointments.service.ts:648-653`, mensaje en español y tratar el 500 de OpenWA como enviado-sin-confirmar. Las estadísticas de `platform/page.tsx:153-159` no deben alarmar por ese 500. `wa-inbound/index.ts:429-435`: la alerta "WhatsApp desconectado" no se guarda (`user_id` NOT NULL). **No** agregar reintentos, porque duplicarían los mensajes.

---

## 3. Estrategia de caché local / offline para Cuba

**Principio:** el dueño tiene que poder **abrir y leer** su día sin señal. Las **escrituras** (crear, cobrar, aprobar) y lo que decide un cupo (huecos, asientos) **siempre van al servidor**. No hay cola de escrituras offline en el piloto.

**Por qué alcanza con poco:** los datos de negocio pesan muy poco (agenda del día 0,5–0,9 KB; salidas + puntos + reservas ~4,6 KB; info pública 1,2–1,8 KB comprimida; Supabase ~35 KB en un día completo de uso). Lo caro es el código: 401 KB de JS en la primera carga del panel y ~440 KB por página pública. Por eso la caché de datos se guarda casi gratis, y el ahorro grande está en P2-02 y en no repetir pedidos (P2-04/05).

**Qué cachear (persistido en el dispositivo, máx. 24–48 h):**
| Dato | Clave TanStack | Motivo |
|---|---|---|
| Perfil, organización, módulos, moneda, zona horaria | `['profile']`, `['organization',orgId]` | evita "Sin organización asignada" (P0-22) |
| Agenda ±7 días | `appointmentKeys.list(...)` | el dueño ve su día en frío y sin red |
| Salidas de las próximas 48 h + pasajeros + puntos | `tripKeys.list`, `tripBookingKeys.byTrip` | hoja del chofer sin señal en la parada (P1-17) |
| Catálogos (servicios, profesionales) | `serviceKeys`, `staffKeys` | casi no cambian |
| Info pública (/book, /trips) | solo en memoria y `sessionStorage` (P2-10) | para el paso actual; no hace falta persistirla |

**Siempre fresco (nunca desde la caché persistida):** huecos libres (`public_slots`, staleTime 0), asientos restantes al confirmar (la RPC con lock decide), el resultado de `book` (con `request_key`, P0-09), el límite por teléfono, el estado de licencia para escribir (la RLS decide; la UI revalida en foco) y los estados de cobro antes de registrar un pago.

**Cómo (coherente con TanStack Query + Capacitor):**
1. **Sin dependencias nuevas (hacer ya):** `query-client-provider.tsx` → `networkMode:"offlineFirst"`, `retry:2`, `gcTime: 24h`; mutaciones `networkMode:"online"` + banner "Sin conexión" con `onlineManager`; `keepPreviousData` en listas y búsquedas; perfil sin borrar ante un error de red (P0-22). Con esto la app ya no cae a estados falsos durante la sesión.
2. **Con una dependencia nueva (decisión D-01):** `@tanstack/react-query-persist-client` + un persister síncrono sobre `localStorage` (web) o `@capacitor/preferences` (nativo), con `maxAge` 48 h, `dehydrateOptions.shouldDehydrateQuery` en **lista blanca** (tabla de arriba), `buster` = versión de la app y **borrado al cerrar sesión**. Al abrir, el panel se ve al instante con "Datos de hace X min" y se refresca solo.
3. **Web/PWA (decisión D-02):** un `public/sw.js` mínimo sin dependencias: cache-first para `/_next/static/*` (inmutables) y network-first para el HTML con respaldo al shell. Solo fuera de Capacitor (la APK ya trae el código adentro). Sin esto, en la web, tocar una sección sin red deja la página en blanco.
4. **Polling y Realtime:** mantener el polling público de 30 s (0,5–2 KB cada 30 s, 0 si está oculto), con preflight cacheado (P2-03). Realtime del panel con debounce y recuperación al reconectar (P1-12, P2-05); en reposo, ~10 KB al unirse y casi cero después.

---

## 4. Métricas medidas

| Métrica | Valor | Dispositivo/red |
|---|---|---|
| Página pública /book y /trips en frío | 438–443 KB transferidos, 23–25 pedidos (17–18 scripts, 2 fuentes de 88 KB) | Galaxy S5 / iPhone |
| JS de la página pública | 325–365 KB comprimido; 1,3–1,4 MB sin comprimir | — |
| Dato de negocio útil en esa carga | 1–2 KB (info 3,45 KB raw / 1,38 KB gzip) | — |
| Contenido útil /book | 7,7–15,7 s regular3g; 21–36 s slow3g (5,7 s en blanco) | Galaxy S5 CPU 6x |
| Contenido útil /trips | 26–37 s slow3g | Galaxy S5 |
| Recarga en caliente /trips | ~5 KB | — |
| Edge functions públicas | 3–8 s típico; 1 arranque en frío de 11 s (no confirmado) | red de prueba inestable |
| Polling público en reposo | 0,5–2 KB / 30 s visible (~2,5 KB/min en trips); 0 oculto | — |
| Toques: sacar turno (cliente) | 8–9 toques, 4–5 pantallas | Galaxy S5 |
| Toques: reservar 4 asientos (pasajero) | 14 toques, 4 pantallas (11 con 1 asiento) | Galaxy S5 / iPhone |
| Toques: crear turno (dueño) | 11 toques + scroll (7 en escritorio) | Pixel 7 |
| Toques: reserva telefónica de viaje | 8 toques | Pixel 7 |
| Completar un turno | 6 toques, 3,7–8,6 s cada uno | Pixel 7 |
| Guardar una salida | 6–16 s (pedidos en serie) | escritorio/dev |
| Doble toque en Confirmar (público) | sin duplicado; resultado en ~1,7 s | iPhone/Android |
| Panel: primera carga | ~467 KB (401 JS, 87 fuentes, 117 RSC .txt) | Pixel 7 regular3g |
| Panel: día completo de uso | ~667 KB en total; Supabase ~35 KB | Pixel 7 |
| Panel: pedidos al abrir Inicio | 11–18 (org x3–4, licencia x2, error_stats) | — |
| Crear servicio / turno | 12 / 13 pedidos | escritorio |
| Prefetch 404 (build en Windows) | 24 pedidos / ~91 KB en la primera carga | — |
| Realtime en reposo | 7 canales, ~10 KB al unirse, ~600 KB en 8 h | — |
| Lista de clientes | ~614 B/fila (2.000 clientes ≈ 1,2 MB por visita) | — |
| Landing | 2.152 KB (PNG 494/817/538 KB) | — |
| App | out/ 9,6 MB; assets Android 7,8 MB | — |
| Login/perfil con latencia real | sign-in ~10 s; user_profiles 11–35 s; un select de 49 s | entorno de prueba |

---

## 5. Decisiones que necesita Roberto

- **D-01 · Guardar datos en el teléfono para usarlos sin señal.** ¿Quieres que el dueño pueda ver la agenda y la lista de pasajeros de las próximas 48 h sin conexión? Requiere una librería pequeña nueva (`@tanstack/react-query-persist-client`). Recomendado: **sí**. Respuesta: Sí
- **D-02 · Modo sin conexión en la versión web (navegador).** ¿Los dueños usarán sobre todo la web o la APK? Si es la web, conviene un service worker mínimo (sin librería). Si es la APK, se puede dejar para después. Respuesta: pensemos q no
- **D-03 · Moneda por defecto para negocios nuevos.** ¿CUP para todos los registros nuevos, o que el dueño elija al registrarse? Respuesta: El dueño elije al registrarse
- **D-04 · Recordar al cliente en el teléfono.** ¿Guardamos nombre y teléfono del cliente en su dispositivo para la próxima reserva? ¿Apellido opcional? ¿Se saltea el paso "¿Con quién?" cuando hay un solo profesional? Respuesta: sí a las tres (recordar nombre y teléfono en su dispositivo, apellido opcional, saltar "¿Con quién?" con un solo profesional)
- **D-05 · Reprogramar un turno.** ¿Al cliente le llega un WhatsApp "tu turno se movió a…"? (Hoy recibe "cancelado" + "confirmado"). Respuesta: si, cambiar el mensaje y pedir confirmación nuevamente
- **D-06 · Registro de negocios.** ¿Pedimos verificar el email o el WhatsApp al registrarse, o lo dejamos abierto con un límite de registros por hora? Respuesta: lo dejamos abierto, solo aclaremos q debe verificar q deben ser reales
- **D-07 · Librerías nativas nuevas.** `@capacitor/app` (botón Atrás de Android, **recomendado sí**), `@capacitor/share` + `filesystem` (compartir la lista del chofer o el CSV desde la APK), `@capacitor/preferences` (sesión y caché más seguras). Respuesta: si
- **D-08 · Teléfonos viejos.** Después de medir el WebView de los teléfonos del piloto: ¿soportamos Android sin actualizar (más trabajo de CSS) o pedimos actualizar el WebView? Respuesta: pedimos actualizar el webview
- **D-09 · ¿iPhone nativo en el piloto?** Si no, se posponen P1-25 y P1-26. Respesta: si, soporte para Iphone
- **D-10 · Cobro de la licencia en Cuba.** ¿Transferencia + WhatsApp a soporte y el admin extiende a mano? ¿Damos licencias largas a los negocios piloto? ¿Con la licencia vencida el dueño ve su agenda en solo lectura (G22) o queda bloqueado del todo? Respuesta: si, no, quedan bloqueado todo
- **D-11 · Límite anti-abuso de reservas web.** Hoy son 3 por teléfono + trampa para bots (decisión previa "no reabrir"). ¿Agregamos un tope de reservas web por salida cada 10 minutos (F09)? ¿Los turnos que carga el dueño cuentan para ese límite (F47)? Respuesta: si, agregamos el tope, los turnos del admin no tienen tope
- **D-12 · Recordatorio antes de la salida (viajes).** El plan lo daba por hecho y no existe (G17). ¿Lo construimos para el piloto? Respuesta: si
- **D-13 · Reportes de viajes.** Hoy Reportes solo muestra turnos (decisión v1). ¿Basta con aclarar el título? Respuesta: construir reportes de viajes
- **D-14 · Qué puede hacer un empleado.** ¿Puede borrar clientes, exportar el CSV o leer todos los WhatsApp? ¿Puede aprobar o cobrar en Viajes? Respuesta (aclarada 2026-10-06): **todo lo del día a día** — turnos, clientes, y en Viajes **solo la gestión de pasajes**: cargar reservas, revisarlas, aprobarlas, cobrar el anticipo y cancelar una reserva. **Las salidas (crear, editar, duplicar, cancelar) son solo del dueño.** **No**: Ajustes, Servicios, Profesionales, Reportes, Suscripción ni Invitar personal (siguen siendo del dueño). No habrá rol de chofer: el chofer sigue siendo solo nombre, teléfono y vehículo en la salida.
- **D-15 · Prueba desde Cuba.** Antes del piloto, alguien en Cuba debe abrir /book y /trips con datos ETECSA y Wi-Fi Nauta, hacer una reserva de cada tipo y entrar al panel (M71). Si `vercel.app` o `supabase.co` están bloqueados, hay que cambiar el hosting. Respuestas: ya eso está probado

---

## 6. Hallazgos descartados o en disputa

- **F02** (resuelto, no es fallo): Roberto confirmó el 2026-10-06 que los WhatsApp llegan aunque OpenWA responda 500. El resto pasó a P3-26.
- **F09** (en disputa): sin límite por IP en las reservas públicas. Uno lo confirma (medio); el otro dice que es el alcance aprobado v1 (3 por teléfono + honeypot, "no reabrir"). Pasa a D-11.
- **F32** (en disputa → P2-08): los 404 de prefetch vienen del build hecho en Windows; en Vercel (Linux) no deberían pasar. M67 lo confirma en el build local.
- **F47** (refutado): que los turnos del dueño cuenten para el límite es la regla aprobada; queda como pregunta en D-11.
- **F54** (refutado): reutilizar la ficha existente sin sobrescribir es una decisión documentada. **Pero M34 (confirmado, medio)** muestra que el nombre escrito se pierde en silencio → arreglo sugerido: anteponer "Reservó: <nombre>" a las notas en las RPC y en `createManual`. Pendiente de priorizar (P2 sugerido).
- **F66** (incierto): el arranque en frío de 11 s en `public-trips` no se reproduce; hay que medirlo en los logs de Supabase antes de actuar.
- **F73** (refutado): la lista sí se actualiza; solo hay 3 GET duplicados (incluido en P2-05).
- **F75** (refutado): el editor de horario no se puede editar antes de cargar; queda un pedido extra de ~0,5 s.
- **F91** (refutado): guardar el horario es 1 pedido; la lentitud vino del servidor dev compartido.
- **F105** (refutado): las consultas duplicadas del detalle de organización vienen de StrictMode en dev. El `select('*')` de errores es real pero menor (solo admin).
- **F110** (refutado): logout de 8 s y "Verificando" de 10 s son artefactos de dev; en realidad ~1–1,7 s. Opcional: `signOut({scope:'local'})`.
- **F115** (refutado): que la ida y vuelta herede el precio de la salida es la regla documentada; opcional, un aviso en el editor.
- **G02** (refutado): validar la firma del webhook es correcto; falta una herramienta para firmar pruebas (sugerido: script interno).
- **G33** (refutado): Reportes sin viajes es v1 por decisión → D-13.
- **G41** (incierto → unido a P1-25): pérdida del token por cookies en un cierre brusco; depende de la reutilización de tokens en GoTrue.
- **M31** (refutado): el toast de error no tapa el encabezado ni corta la X; como mucho, alargar su duración.
- **M71** (incierto, **importante** → D-15): falta comprobar que el hosting sea accesible desde redes cubanas.
- **Partes descartadas dentro de hallazgos confirmados:** "30 de 60 días" en /book es un tope intencional (F97); ver o cancelar turnos de otros profesionales es el permiso documentado del empleado (G13); "el '👍' no recibe respuesta" es falso porque sí recibe la aclaración (G37).
- **G22** (confirmado, medio, decisión): bloqueo total con la licencia vencida, sin modo de solo lectura → D-10. Textos coherentes incluidos en P0-24.
- **G17** (confirmado, medio): recordatorio de viajes inexistente → D-12 (o corregir el PRP).

---

## 7. Cobertura

**Probado (escritorio y web):** login y recorrido completo del dueño (Inicio, Turnos, Servicios, Profesionales, Ajustes, Clientes); creación de servicios, profesionales, horarios y días libres; turnos (doble clic, solapados, hoy, 9 estados, vistas, filtros, Realtime entre pestañas); salidas (crear, editar, duplicar, reserva manual, cobros, CSV, impresión, cupo, cancelación); flujo público /book y /trips completo con límites, honeypot, carreras, red cortada y respuesta perdida; seguridad anónima y entre organizaciones (21 tablas y vistas, 19 RPCs, storage, edge functions); admin (plataforma, organizaciones, usuarios, errores, módulos); onboarding self-service; rendimiento en el build de producción (frío y caliente, 3G, reposo, foco); auditoría de código de caché, Realtime, lógica de reservas y migraciones 001–047; WhatsApp entrante (en modo solo lectura), rol de empleado, licencias y RevenueCat (solo autenticación).

**Probado (móvil):** Galaxy S5 360x640 (CPU 6x, regular3g/slow3g), Pixel 7, iPhone SE 1.ª y 3.ª gen, iPhone 13 y 15 Pro (WebKit); flujos públicos completos con reservas reales (T-0044/47/48, V-0009/10/14, todas canceladas); teclado emulado, Atrás, doble toque, cambio a WhatsApp y descarte de pestaña; panel del dueño en Android e iPhone (crear turno, detalle, Viajes, reserva telefónica, cobro, aprobación, cancelación); barrido visual automático de todas las rutas a 320/360/390 px en claro y oscuro (180 capturas); auditoría de la app nativa (Capacitor 8, WebView, safe areas, tamaño de la APK, sesión offline).

**No probado:**
- Teléfonos físicos (Moto G4 / Galaxy A55 reales), APK instalada en un dispositivo, iOS nativo (no compila hoy), zoom real de iOS, pull-to-refresh y autocompletado reales.
- **Acceso desde redes cubanas (ETECSA, Nauta)** y la versión real del WebView de los teléfonos del piloto.
- WhatsApp entrante de punta a punta (sin secreto de prueba) y los recordatorios disparados por el cron.
- Entrega real de WhatsApp: no se probó en los teléfonos; Roberto confirmó que los mensajes llegan.
- Licencia vencida forzada en el flujo completo de cierres, clientes y reportes; build de producción medido por algunos testers (el :3100 estuvo caído).
- Carrera de dos clientes por el mismo hueco con reservas reales (el límite por teléfono lo impidió).
- Listas largas (solo había 11 clientes) y rendimiento de la lista virtualizada.
- Usuarios con rol "special" en datos reales, invitaciones reales y compras de RevenueCat.

**Datos de prueba que quedaron:** salidas "QA iOS salida 190471" (7 y 9 oct), servicios "QA F16 …", profesional "QA Verif F73", salida "QA F24 verif sobreventa", el objeto QA en el bucket `trip-photos` (hay que borrarlo con service role) y el usuario `qa.staff.1@example.com` a medio borrar (baneado).
