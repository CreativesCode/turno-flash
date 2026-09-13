---
name: modulo-reserva-asientos
description: Idea aprobada (sin empezar) de un modulo aparte para vender asientos de guagua con salidas por dia y sena; que se reutiliza y que es nuevo
metadata:
  type: project
---

**Estado: EN CONSTRUCCION. Fases 1-4 de 10 hechas** (2026-09-11 y 2026-09-12). Plan completo y
decisiones cerradas en `.claude/PRPs/prp-seat-booking.md`. **Lo siguiente es la pagina publica
`/trips`** (Fase 8), que es lo que el usuario mas espera; quedan tambien el cron (5), modulos en
registro/admin/nav movil (6), Ajustes (7) y WhatsApp (9).

- Migraciones aplicadas: **033** (modelo), **034** (revoke de la funcion trigger), **035** (vista de
  licencia recreada), **036** (`set_trip_booking_number`: las reservas cargadas a mano son un INSERT
  normal y no pasaban por el RPC que numera).
- Edge function `public-trips` desplegada y probada end-to-end.
- Dashboard: `/dashboard/trips` (salidas) y `/dashboard/trips/details?id=` (pasajeros, seña, aprobar,
  export CSV, impresion, carga manual con telefono obligatorio).
- Solo "Organizacion test" tiene el modulo activo; los negocios reales no ven nada nuevo.

## Decisiones de producto cerradas (2026-09-11, no reabrir)

- **Sena fuera de la app** en v1: el cliente paga por transferencia/Bizum/efectivo segun las
  instrucciones que escribe el negocio; el dueno marca "Sena cobrada". La pasarela entra despues
  sin migrar datos.
- **Sin mapa de butacas**: el cliente elige cantidad de asientos, no asiento concreto.
- **Viajes del mismo dia** (hora de salida + hora de regreso opcional), no multi-dia.
- **Lista nominal de pasajeros**: un nombre por asiento, obligatorio desde la web y opcional al
  cargar una reserva por telefono desde el dashboard. Exportable en CSV con `utils/csv.ts`.
- **Aprobacion por salida** (`trips.requires_approval`, default true), mismo patron que
  `services.requires_approval`.
- **Confirmacion y pago son ejes independientes**: `status` (aprobacion) y `deposit_status` (dinero)
  no se mueven entre si. El vencimiento automatico mira **la sena**, no la aprobacion: una reserva
  confirmada pero impaga se cancela igual al vencer.

## Modulos por negocio (decidido 2026-09-11)

Un negocio puede tener **Turnos, Viajes o los dos**: `organizations.appointments_module_enabled` y
`trips_module_enabled`, con CHECK de que al menos uno este activo. **Se eligen al registrarse** y
**solo un admin de plataforma los cambia despues**.

**Why:** la policy de UPDATE de la migracion 002 deja que un owner edite su propia organizacion, asi
que esconder los switches en la UI no alcanzaba.
**How to apply:** la barrera real es el trigger `enforce_module_change_is_admin` (033). Deja pasar a
`service_role` (`auth.uid()` NULL), que es como el registro escribira esas columnas desde
`self-signup` en la Fase 6 — `create_organization_with_owner` NO se toca para no duplicar sus 130
lineas ni crear una firma ambigua.

**Ojo, agujero preexistente detectado y NO arreglado:** esa misma policy permite hoy que un owner
edite por API `license_start_date` / `license_end_date` de su organizacion. El trigger de modulos se
puede extender para cubrirlas; el usuario aun no decidio. Ver [[license-enforcement]].

## Que quiere el usuario

Un modulo **aparte** (el "caso 2") para negocios de viajes en guagua (bus):
- Se venden **asientos**, no la guagua entera. Cada guagua tiene capacidad limitada.
- Hay **salidas con horario por dia**, y cada salida/viaje tiene **su propia descripcion** (ruta,
  destino, que incluye).
- El cliente paga una **sena** (senal/deposito) al reservar.

**Why:** el motor actual de turnos es 1 reserva = 1 hueco exclusivo en la agenda de un profesional;
convertirlo en asientos romperia lo que funciona para peluquerias y clinicas.
**How to apply:** modulo nuevo al lado de `appointments`, NO modificar `is_staff_slot_free`,
`create_public_booking` ni el modelo de turnos para meter capacidad. El caso 1 (alquilar la guagua
entera en el mismo dia) ya funciona hoy modelando guagua = profesional y viaje = servicio.

## Que se reutiliza

Organizaciones, roles, licencia/trial, clientes por telefono (`booking_phone_key`), WhatsApp
(avisos y recordatorios), patron de pagina publica estatica + edge function con logica en Postgres
(ver [[reserva-online]]), limite de reservas por telefono + honeypot.

## Que es nuevo (a definir en el PRP)

- Guaguas con capacidad; **salidas** fijas creadas por el dueno (fecha, hora, guagua, descripcion,
  precio, plazas).
- Reserva por **cantidad de pasajeros** que descuenta plazas, con bloqueo atomico contra sobreventa
  (mismo enfoque que `pg_advisory_xact_lock` de la 029).
- **Lista de pasajeros** por salida para el chofer.
- Pagina publica propia: elegir salida → cantidad de pasajeros → datos → pagar sena.
- **Cobro de sena**: no existe ningun cobro web hoy (RevenueCat es solo para la suscripcion de la app).
  Elegir pasarela es decision a confirmar con el usuario; ojo que la app es static export
  ([[arquitectura-static-export]]): los webhooks de pago van en edge functions.
- Cada negocio debe poder activar el modulo (probablemente un tipo/flag por organizacion).

## Decisiones de UI (del usuario, 2026-09-12)

- **Seguir el layout de las vistas existentes**, no inventar: header sticky con buscador, FAB en
  movil, estados vacios en tarjeta, grid de 3 columnas. El primer intento no lo seguia y hubo que
  rehacerlo.
- **Sheet ancho** (`maxWidthClass="sm:max-w-3xl"`) para formularios largos; el default `sm:max-w-lg`
  queda incomodo.
- **Descripcion y punto de encuentro son textarea**, no input de una linea.
- **Texto enriquecido con la sintaxis de WhatsApp** (el usuario insistio dos veces; texto plano no
  alcanzaba). Sin libreria externa, implementado en el proyecto:
  - `utils/whatsapp-format.ts`: parser de *negrita*, _cursiva_, ~tachado~ y triple-backtick mono
    a nodos, mas `toggleMark` para poner/quitar formato sobre la seleccion.
    Probado: "2 * 3 = 6" NO se formatea y el anidamiento funciona.
  - `components/ui/rich-text.tsx` (`<RichText>`) renderiza a elementos React, nunca HTML crudo.
  - `components/ui/rich-text-editor.tsx` (`<RichTextEditor>`): textarea + barra (negrita,
    cursiva, tachado, mono) + vista previa.
  **Why:** lo que el dueno escribe se guarda tal cual y se puede **pegar en WhatsApp viendose igual**.
  **How to apply:** `<RichTextEditor>` en textos largos nuevos, `<RichText>` para mostrarlos.
  *Pendiente pedido:* boton "Compartir" que arme el mensaje del viaje para WhatsApp.
- **Exportacion e impresion por pasajero, no por reserva.** Una reserva de 4 asientos de 2000 debe
  mostrar **500 por pasajero**, no 2000 repetido en cada fila. La impresion
  (`components/trips/PassengerPrintSheet.tsx`) es la misma tabla del CSV con el nombre de la
  organizacion, los datos de la salida y totales, visible solo en `print:`.
- **Ojo con `overflow-hidden` en tarjetas con menu kebab**: recorta el desplegable. Paso en
  `TripCard` y se quito.
- **Inputs numericos: vaciarlos no debe poner 0.** Patron: el estado del formulario acepta `""`
  mientras se escribe (`TripFormState`) y se convierte a numero al guardar. Era un error que ya
  molestaba en el proyecto; aplicar el mismo patron en formularios nuevos.

## Precios por parada, cobros y extras (2026-09-12, migraciones 037 y 038)

Decidido con dos ejemplos reales del negocio (agencias de viaje cubanas, rutas Santa Clara /
Sagua - La Habana) que el usuario pego en el chat:

- **El precio y la sena viven en el punto de recogida**, no en la salida: el mismo viaje vale
  8500 desde Santa Clara y 10000 desde Sagua, y la sena por transferencia cambia igual
  (`trip_pickup_points`: nombre, indicaciones, hora, precio, sena). La salida conserva su precio
  como **valor por defecto** para el caso simple sin paradas.
  Si la salida tiene paradas cargadas, **elegir una es obligatorio** (`pickup_point_required`).
- **Se cobra en dos momentos**: sena por transferencia al reservar y el resto **en efectivo al
  chofer** el dia del viaje. Por eso se guarda `amount_paid` (dinero recibido) y todo lo demas se
  deriva: falta por cobrar = `price_total + extra_amount - amount_paid`.
  `deposit_status` lo mantiene el trigger `sync_trip_deposit_status` (037), asi que la app solo
  escribe el monto. El cron de vencimiento sigue funcionando sin cambios.
- **Extras por reserva** (`extra_description` + `extra_amount`, migracion 038): "llevarlo al
  aeropuerto", equipaje, otro destino. Texto libre y monto, no un catalogo: cada negocio lo
  redacta distinto y el precio se acuerda caso a caso. Suma a lo que falta cobrar.
- **La hoja del chofer es lo que importa**: el PDF lista por pasajero cuanto pago y **cuanto hay
  que cobrarle**, con el total "a cobrar en el omnibus".

### Chofer, ventana de reserva y moneda (2026-09-12, migraciones 039 y 040)

- **Chofer, telefono y vehiculo por salida, siempre opcionales** (`trips.driver_name`,
  `driver_phone`, `vehicle_description`): la salida se vende antes de asignar chofer y el dato
  se manda el dia antes.
- **Ventana de reserva por salida** (`booking_opens_at` / `booking_closes_at`, ambos opcionales):
  el caso real es "se reserva el jueves anterior a partir de las 4PM". La pagina publica **lista**
  la salida aunque este cerrada, con `booking_open` y la fecha de apertura, para poder decir
  "abre el X" en vez de esconderla.
  **Solo se bloquea la web**: el negocio puede cargar una reserva por telefono fuera de ventana
  (el trigger `enforce_trip_booking_window` filtra por `source = 'web'`).
  **Gotcha:** ese trigger lanza excepcion, no devuelve JSON como el resto de errores del RPC, asi
  que la edge function mapea el mensaje `booking_window_closed` a un 422 legible. Se eligio el
  trigger para no copiar por tercera vez las ~200 lineas de `create_trip_booking`.
  Al **duplicar** una salida la ventana se desplaza los mismos dias que la fecha de salida.
- **Moneda por organizacion** (`organizations.currency`, default USD; backfill desde la moneda mas
  usada en `services`). El dueno la elige en Ajustes. Formatear **siempre** con el hook
  `useMoney()`, no con `fmtMoney` directo, que asume ARS.
  Cambiarla no convierte montos, solo cambia como se muestran.

### Lo que los ejemplos piden y TODAVIA NO esta

- **Ida y retorno a precio distinto** (8500 solo ida / 17000 ida y vuelta). Hoy se puede simular
  con dos paradas, pero es un parche: falta modelar el tipo de billete.
- **Foto del bus** (el nombre y telefono del chofer ya estan; la foto necesita Storage).

## Lo construido en la Fase 1 (2026-09-11)

- `trips` (una salida concreta) y `trip_bookings` (N asientos de esa salida), con RLS del patron 027
  (lectura para miembros, escritura owner/admin + licencia usable) y **sin ninguna policy para anon**.
- Capacidad **calculada** (`trip_seats_taken`, SUM de reservas vivas), nunca un contador denormalizado.
- `create_trip_booking`: `pg_advisory_xact_lock` por salida, recuento dentro del lock, cliente
  reutilizado por `booking_phone_key`, numero `V-0001` por org, maximo 3 reservas futuras por telefono.
  **Probado: la sobreventa es imposible.**
- `public_trips_info` (salidas publicadas con plazas libres) y `public_trips_org_open`
  (modulo + pagina publicada + org activa + licencia), ambas solo para `service_role`.
- `release_expired_trip_holds()` lista para el cron de la Fase 5.
- `trips` y `trip_bookings` agregadas a la publicacion de Realtime.
- `business_settings`: `seat_booking_enabled`, `seat_booking_hold_hours`, `deposit_instructions`.

**Realtime en paginas publicas: no se puede y no se debe.** Realtime respeta RLS y `anon` no tiene
policies; enchufarlo obligaria a abrir lectura de `trip_bookings`/`appointments` (nombres y telefonos).
En su lugar, revalidacion automatica contra la edge function. En el dashboard si hay Realtime real:
`useRealtimeEntities` ya montado en `app/dashboard/layout.tsx`.

Relacionado: [[producto-y-dominio]], [[reserva-online]], [[whatsapp-automatizaciones]].

## Foto del vehículo (2026-09-12)

Migración 041: bucket **`trip-photos`** (el primero del proyecto), lectura pública porque la
página de reservas no tiene sesión, escritura solo de `admin`/`owner` de la organización, que se
valida por la primera carpeta del path (`<organization_id>/<uuid>.jpg`). `trips.vehicle_photo_path`
guarda el path, no la URL. La foto se achica en el navegador antes de subir (`utils/image.ts`).
Duplicar una salida copia el archivo.

También de esta tanda: `components/ui/select.tsx`. Los `<select>` nativos dibujan su flecha pegada
al borde, ignorando el padding; la primitiva `Select` la tapa con `appearance-none` y dibuja un
`ChevronDown` alineado. **Cualquier select nuevo va con esa primitiva**, no con `<select>` suelto.

## Ida y vuelta, módulos, página pública y WhatsApp (2026-09-12)

- **042**: ida y vuelta como propiedad de la reserva (`trip_bookings.trip_type`), con precio por
  salida y por parada. El precio se resuelve en `trip_seat_price` y `create_trip_booking` la llama:
  **cualquier regla nueva de precios va ahí**, no dentro del RPC.
- **043 + 044**: WhatsApp de viajes en `wa-trip-send` (`wa-send` intacta). Un mensaje por evento:
  reserva recibida, aviso al negocio, aprobada, seña cobrada. **045** revoca el EXECUTE de las
  funciones de trigger, como la 034.
- **Página pública `/trips?b=<slug>`**: pasos salida → asientos y nombres → datos → listo. Revalida
  sola cada 30 s y **antes** de pedir los datos personales. Mismo tratamiento agregado a `/book`.
- **Módulos**: se eligen en el registro (pregunta de negocio, no de módulos), los cambia solo un admin
  desde el detalle de la organización, y la `MobileTabBar` arma sus slots según ellos.
- Queda pendiente a propósito: el **cron de vencimiento de señas** (Fase 5), que el usuario dejó fuera
  de esta tanda.

## Copy: "anticipo", no "sena" (2026-09-12)

Todo el modulo hablaba en voseo rioplatense y llamaba **"sena"** al pago que reserva el
asiento. Se migro a espanol internacional: los textos van en tuteo y el pago es el
**"anticipo"** (masculino: *el* anticipo, *un* anticipo, anticipo *cobrado*). Las columnas de
la base siguen llamandose `deposit_*`, que es lo correcto en ingles — el cambio es solo de
copy. Regla completa en [[copy-espanol-internacional]].
