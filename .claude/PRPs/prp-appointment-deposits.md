# PRP-006: Anticipos en turnos (TUR0003)

> **Estado**: COMPLETADO (2026-10-19) — falta la prueba con un WhatsApp real
> **Fecha**: 2026-10-19
> **Proyecto**: Turno Flash
> **Tarea**: TUR0003 «Implementar cobro de anticipos en turnos» (estimación 3-5 días)

---

## Objetivo

Un negocio puede pedir un **anticipo** para reservar ciertos servicios (importe fijo o porcentaje del precio).
El turno queda **pendiente hasta que el dueño verifica el anticipo**; al verificarlo, el turno se confirma solo.
El cliente recibe el importe y las instrucciones de pago al reservar, y puede avisar «ya pagué» por WhatsApp.

## Por Qué

| Problema | Solución |
|----------|----------|
| Clientes que reservan y no vienen (sesiones de fotos, servicios largos): el hueco se pierde | El turno solo se confirma con el anticipo cobrado |
| El dueño pide el anticipo a mano por WhatsApp y lleva la cuenta de memoria | Importe calculado solo, instrucciones automáticas y estado visible en cada turno |
| No queda registro de quién comprobó el cobro | Se guarda quién verificó y cuándo |

**Valor de negocio**: menos ausencias en los servicios caros; mismo modelo que ya usan los pasajes, que los dueños
cubanos conocen (transferencia + aviso por WhatsApp, sin pasarela de pago).

## Qué

### Decisiones tomadas (Claudia, 2026-10-19)
- **Por servicio**: cada servicio dice si pide anticipo, si es fijo o porcentaje, y cuánto. En un turno concreto el
  dueño puede **perdonarlo** (queda sin anticipo).
- **Estados**: pendiente → solicitado → pagado → verificado, y además cancelado y devuelto.
  - *Solicitado*: se le mandaron al cliente el importe y las instrucciones.
  - *Pagado*: el cliente avisó que pagó (respondiendo por WhatsApp).
  - *Verificado*: el dueño comprobó que llegó el dinero; se guarda **quién** y **cuándo**.
  - *Cancelado*: el turno se canceló sin haber cobrado el anticipo.
  - *Devuelto*: el turno se canceló y el anticipo cobrado se devolvió.
- **Sin pago no hay confirmación**: un turno con anticipo queda *pendiente* hasta verificarlo; verificar lo confirma
  y desde ahí salen los recordatorios. No hay vencimiento automático (decide el dueño, como en pasajes).
- **Reserva online y WhatsApp**: `/book` muestra el importe antes de reservar, y el WhatsApp de la reserva lleva
  importe e instrucciones (las mismas «Instrucciones del anticipo» de Ajustes que ya usan los pasajes).

### Supuestos (decisiones técnicas o menores; corregir si no encajan)
- El anticipo se **calcula y guarda al crear el turno** (si el precio del servicio cambia después, el turno conserva
  su importe). Porcentaje sobre el precio del servicio, redondeado a enteros.
- **Un turno creado desde el panel** para un servicio con anticipo también queda pendiente, pero el formulario deja
  marcarlo ya *verificado* (lo cobró en mano) o *perdonarlo*.
- **Aprobación**: si el servicio pide anticipo, verificar el anticipo cuenta como aprobar el turno (no se pide dos veces).
- **«Ya pagué»**: respuestas como «ya pagué», «transferí», «listo el pago» **o una foto** (la captura de la
  transferencia) a un turno con anticipo solicitado lo pasan a *pagado* y avisan al negocio. Las fotos hoy se ignoran.
- **Moneda**: la del negocio (`useMoney`). El anticipo nunca supera el precio.
- Reportes de ingresos por anticipos: **fuera** de esta tarea.

### Criterios de Éxito
- [x] En Servicios, el dueño activa el anticipo en un servicio como fijo o porcentaje (validado con Zod: fijo ≤ precio, porcentaje 1-100).
- [x] Al reservar ese servicio (web o panel) el turno nace *pendiente* con el importe calculado y el anticipo *pendiente*.
- [x] El cliente recibe por WhatsApp importe e instrucciones y el anticipo pasa a *solicitado*.
- [x] El cliente responde «ya pagué» o manda una foto → *pagado* y aviso al negocio. *(Código y mensajes probados por partes; la prueba con un WhatsApp real queda pendiente: `wa-inbound` exige la firma del webhook.)*
- [x] El dueño verifica → *verificado*, con quién y cuándo; el turno pasa a *confirmado* y el cliente recibe la confirmación.
- [x] Ningún recordatorio sale para un turno con el anticipo sin verificar.
- [x] Cancelar un turno con anticipo sin cobrar → *cancelado*; con anticipo cobrado, el dueño puede marcar *devuelto*.
- [x] El dueño puede perdonar el anticipo de un turno concreto.
- [x] `/book` muestra el importe del anticipo del servicio antes de confirmar la reserva.
- [x] Un servicio sin anticipo funciona exactamente igual que hoy (web, panel, WhatsApp).
- [x] El empleado ve el estado del anticipo; verificar/devolver/perdonar es de dueño y admin.
- [x] Manual de usuario actualizado (texto y foto).

---

## Contexto

### Referencias
- Pasajes, el modelo a copiar: `trip_bookings.deposit_*`, trigger `sync_trip_deposit_status` (037),
  `components/trips/PaymentSheet.tsx`, `business_settings.deposit_instructions`, `wa-trip-send`.
- Turnos: `services/appointments.service.ts` (creación, `finalStatus`), `create_public_booking` (RPC de `/book`),
  `trigger_wa_send_on_appointment` / `trigger_wa_on_appointment_approved`, `wa-send` (intents), `wa-inbound`
  (`classifyReply`, hoy ignora los mensajes que no son texto), `wa_appointments_in_window` (recordatorios: ya
  excluye `pending`).
- Memoria: `modulo-reserva-asientos.md` (anticipo y aprobación son ejes separados), `whatsapp-automatizaciones.md`,
  `license-enforcement.md` (toda tabla con datos del negocio ya está cubierta por 087; funciones DEFINER deben
  comprobar la licencia).

### Modelo de datos (borrador)
```sql
-- services
deposit_type   TEXT  NULL CHECK (deposit_type IN ('fixed','percent'))   -- NULL = sin anticipo
deposit_value  NUMERIC(10,2) NULL                                        -- importe o porcentaje

-- appointments
deposit_amount       NUMERIC(10,2) NULL            -- calculado al crear; NULL = sin anticipo
deposit_status       appointment_deposit_status NULL
                     -- pending | requested | paid | verified | cancelled | refunded
deposit_verified_by  UUID NULL REFERENCES auth.users ON DELETE SET NULL
deposit_verified_at  TIMESTAMPTZ NULL
```
Las transiciones van por una RPC (`set_appointment_deposit`) que valida rol, licencia y estado de origen, y al
verificar confirma el turno. RLS: las tablas ya tienen la política de licencia (087).

---

## Blueprint

### Fase 1: Base de datos
**Objetivo**: columnas, enum, cálculo del importe al crear el turno (web y panel), RPC de transiciones con
verificación → confirmación, cancelación → *cancelado*, `create_public_booking` y `public_booking_info` con el anticipo.
**Validación**: ensayo por rol en transacción revertida (dueño, empleado, otro negocio, admin, negocio bloqueado);
un servicio sin anticipo da exactamente el mismo resultado que hoy.

### Fase 2: Servicios (configuración)
**Objetivo**: en el formulario del servicio, interruptor «Pedir anticipo», fijo/porcentaje e importe, con vista del
importe resultante; marca en la tarjeta del servicio.
**Validación**: tsc + eslint; Playwright: crear y editar un servicio con anticipo.

### Fase 3: Turnos en el panel
**Objetivo**: estado del anticipo en la ficha del turno y en las listas; acciones verificar / devolver / perdonar /
reenviar instrucciones; al crear desde el panel, opción «ya cobrado» o «sin anticipo».
**Validación**: Playwright con un negocio desechable: el turno queda pendiente, verificar lo confirma y deja quién.

### Fase 4: Reserva online
**Objetivo**: importe del anticipo en la elección del servicio y en el resumen; pantalla final con «tu turno se
confirma al pagar el anticipo» y las instrucciones.
**Validación**: Playwright en `/book` con y sin anticipo.

### Fase 5: WhatsApp
**Objetivo**: `wa-send` manda importe + instrucciones (→ *solicitado*) y la confirmación al verificar;
`wa-inbound` reconoce «ya pagué» y las fotos (→ *pagado* + aviso al negocio). **El despliegue se pregunta.**
**Validación**: transpile + prueba desde fuera con un negocio desechable sin WhatsApp real.

### Fase 6: Validación final y documentación
**Validación**:
- [x] `npx tsc --noEmit` y `npx eslint` de lo tocado pasan
- [x] `npm run build:next` exitoso
- [x] Criterios de éxito cumplidos
- [x] Manual (texto y foto) y memoria al día; despliegue registrado en Tasknic

---

## Cómo quedó

- **Base de datos:** 090 (columnas, `service_deposit_amount`, triggers `compute_appointment_deposit` y
  `guard_appointment_deposit`, RPC `set_appointment_deposit(id, 'verify'|'waive'|'refund')`, reserva pública con el
  anticipo), 091 (`appointments_with_details` con las columnas del anticipo), 092 (intents de WhatsApp y el guard
  reconoce a las edge por su rol de base de datos).
- **App:** Servicios (anticipo fijo o %), ficha del turno (`DepositPanel`), alta desde el panel (`DepositChoice`),
  «Falta anticipo» en la lista, `/book` (importe antes de reservar, «Reserva recibida» con instrucciones) y Ajustes
  (tarjeta «Cómo se paga el anticipo» para negocios de solo turnos).
- **Edge:** `public-booking` v7, `wa-send` v36, `wa-inbound` v49.
- **Manual:** «Pedir un anticipo» en Servicios + 7 secciones tocadas; foto nueva `deposit.webp`.
- **Límites conocidos:** el anticipo pasa a *solicitado* solo si OpenWA responde OK (con sus 500 que igual entregan,
  puede quedarse en *pendiente*; no cambia nada para el cliente). `wa-trip-send` conserva su propia copia de
  `money()`; la de `_shared/wa-message.ts` es la nueva.

## Aprendizajes

### 2026-10-19: `IF NOT x` con x NULL no entra
- **Error**: el guard de los campos del anticipo dejaba al dueño cambiarlos directo. `current_setting('app.x', true)`
  sin definir es NULL, así que `v_allowed` era NULL y `IF NOT v_allowed AND …` nunca se cumplía.
- **Fix**: `COALESCE(current_setting(...) = 'on', false)` (y lo mismo con `auth.role()` y `auth_user_role() IN (…)`).
- **Aplicar en**: cualquier trigger o RPC que decida permisos con settings, claims o roles que pueden faltar.

### 2026-10-19: `appointments_with_details` tiene las columnas congeladas
- **Error**: el panel lee los turnos de esa vista y no traía las columnas nuevas de `appointments` (la vista se creó
  con `a.*`, que Postgres expande al crearla).
- **Fix**: 091, `CREATE OR REPLACE VIEW` con las columnas nuevas **al final** (así se puede reemplazar sin perder
  los permisos) y `security_invoker = true`. Mapearlas también en `utils/normalized-state.ts`.
- **Aplicar en**: cualquier columna nueva de `appointments` que el panel o `wa-send` necesiten.

### 2026-10-19: un campo de Ajustes que solo existía para pasajes
- **Error**: las instrucciones del anticipo vivían en la tarjeta de pasajes y solo se guardaban con `modules.trips`;
  un negocio de solo turnos no podía escribirlas.
- **Fix**: `DepositInstructionsCard` para negocios sin pasajes y `deposit_instructions` siempre en el guardado.
- **Aplicar en**: antes de reutilizar un ajuste de un módulo en otro, comprobar dónde se muestra y cuándo se guarda.

### 2026-10-19: la RPC de reserva pública no se ensaya como `anon`
- `create_public_booking_once` no tiene EXECUTE para `anon`: la llama la edge `public-booking` con la clave de
  servicio. En los ensayos, `SET LOCAL ROLE service_role` con `request.jwt.claims` de `service_role`.
