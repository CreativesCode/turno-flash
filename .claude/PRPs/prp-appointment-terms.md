# PRP-007: Precio y condiciones económicas de cada turno (TUR0007)

> **Estado**: COMPLETADO (2026-10-21)
> **Fecha**: 2026-10-20
> **Proyecto**: Turno Flash
> **Tarea**: TUR0007 «Configurar precio y condiciones económicas del turno» (estimación 2-3 días)
> **Base**: documento «Definición de la configuración del Módulo Finanzas» (Tasknic) y PRP-006 (anticipos, TUR0003)

---

## Objetivo

Cada turno tiene sus propias condiciones económicas: **precio total, anticipo (fijo o %), fecha límite para pagarlo y
condiciones de cancelación/devolución**. Vienen por defecto del servicio y el dueño puede cambiarlas en un turno
concreto, al crearlo o después.

## Por Qué

| Problema | Solución |
|----------|----------|
| El precio del turno es siempre el del servicio: no hay forma de hacer un descuento o un precio especial | Precio editable en cada turno (la columna `price_charged` ya existe y los reportes ya la usan) |
| El anticipo sale siempre igual del servicio | Tipo y valor del anticipo ajustables por turno |
| El cliente no sabe hasta cuándo tiene para pagar | Fecha límite: «hasta X horas antes del turno» en el servicio, fecha concreta editable en el turno |
| Las condiciones de cancelación se explican a mano por WhatsApp | Texto de condiciones en el servicio, ajustable por turno, visible al reservar y en el WhatsApp |

## Qué

### Decisiones tomadas (Claudia, 2026-10-20)
- **El servicio da los valores y el turno los ajusta.** Cambiar el servicio no toca los turnos ya creados.
- **Una moneda por negocio**, como hoy (Ajustes). No hay moneda por turno.
- **Plazo del anticipo: horas antes del turno** (en el servicio). En un turno se puede poner una fecha concreta. Al
  vencer **no pasa nada automático**: el turno muestra «Anticipo vencido» y decide el dueño. Los avisos van en TUR0009.
- **Condiciones en texto libre**: un texto en el servicio (lo que incluye y no incluye el precio, cancelación y
  devolución), editable por turno. Las reglas automáticas de devolución quedan para TUR0010.

### Supuestos (técnicos o menores; corregir si no encajan)
- Solo **dueño o admin** cambian las condiciones de un turno; el empleado las ve.
- El **anticipo ya pagado o verificado no se puede cambiar** (ni su importe ni su plazo). El precio sí; si el anticipo
  es un porcentaje y aún se debe, se recalcula con el precio nuevo.
- **Quitar el anticipo** de un turno que lo debe = «Perdonar anticipo» (ya existe: confirma el turno).
- **Poner un anticipo** a un turno que no lo tenía lo deja *pendiente de pago*, pero no le cambia el estado al turno
  (si ya estaba confirmado, sigue confirmado).
- Las condiciones se muestran al cliente en la reserva online (antes de reservar y al final) y en el WhatsApp de la
  reserva, junto con la fecha límite del anticipo.
- Quién cambió precio o condiciones y cuándo: se guarda el último cambio (`terms_updated_by/_at`). El historial
  completo de cambios económicos va con TUR0008.

### Criterios de Éxito
- [x] En Servicios: «Plazo para pagar el anticipo (horas antes del turno)» y «Condiciones» (texto, hasta 1000).
- [x] Al crear un turno (web o panel) se copian del servicio: anticipo (tipo, valor, importe), fecha límite calculada
      con la zona horaria del negocio y condiciones.
- [x] Al crear un turno desde el panel el dueño puede cambiar precio, anticipo, fecha límite y condiciones.
- [x] En la ficha de un turno el dueño ve y edita precio, anticipo, fecha límite y condiciones; el empleado solo las ve.
- [x] Cambiar el precio recalcula un anticipo porcentual que aún se debe; un anticipo pagado o verificado no cambia.
- [x] La ficha y la lista marcan «Anticipo vencido» cuando pasó la fecha límite y el anticipo se sigue debiendo.
- [x] `/book` muestra las condiciones del servicio antes de reservar y la fecha límite al final.
- [x] El WhatsApp de la reserva incluye la fecha límite y las condiciones.
- [x] Los reportes cuentan el precio del turno (ya usan `price_charged`).
- [x] Un servicio sin plazo ni condiciones funciona exactamente igual que hoy.
- [x] Manual de usuario actualizado (texto y foto si cambia la ficha).

---

## Contexto

- Ya existe: `appointments.price_charged` (sin pantalla; reportes y CSV la usan), `appointments.deposit_amount/status`
  y el resto del anticipo (090-092), `services.deposit_type/value`, trigger `compute_appointment_deposit`, RPC
  `set_appointment_deposit`, `DepositPanel`, `DepositChoice`, `appointments_with_details` (cada columna nueva hay que
  añadirla, ver 091).
- Memoria: `project/anticipos-turnos.md`, `project/license-enforcement.md` (RPC DEFINER deben comprobar licencia;
  preferir INVOKER), `feedback/manual-siempre-al-dia.md`.

### Modelo de datos (borrador)
```sql
-- services
deposit_due_hours  INTEGER NULL CHECK (deposit_due_hours BETWEEN 1 AND 720)  -- horas antes del turno; NULL = sin plazo
payment_terms      TEXT NULL CHECK (char_length(payment_terms) <= 1000)

-- appointments
deposit_type       TEXT NULL      -- 'fixed' | 'percent', copiado del servicio o puesto en el turno
deposit_value      NUMERIC NULL
deposit_due_at     TIMESTAMPTZ NULL
payment_terms      TEXT NULL
terms_updated_by   UUID NULL REFERENCES auth.users ON DELETE SET NULL
terms_updated_at   TIMESTAMPTZ NULL
```
Cambios por una RPC INVOKER `set_appointment_terms(...)` (owner/admin) que valida y recalcula; el guard de 090 se
amplía a las columnas nuevas.

---

## Blueprint

### Fase 1: Base de datos
**Objetivo**: columnas, copia desde el servicio al crear (incluida la fecha límite en la zona del negocio), RPC de
edición con recálculo, guard ampliado, vista con las columnas nuevas y reserva pública con plazo y condiciones.
**Validación**: ensayo por rol en transacción revertida; un servicio sin plazo ni condiciones da lo mismo que hoy.

### Fase 2: Servicios
**Objetivo**: plazo del anticipo (si hay anticipo) y condiciones en el formulario del servicio.
**Validación**: Playwright con un negocio desechable.

### Fase 3: Turnos en el panel
**Objetivo**: condiciones al crear un turno (sección plegada «Precio y condiciones»), edición en la ficha (hoja
«Precio y condiciones»), «Anticipo vencido» en ficha y lista.
**Validación**: Playwright: crear con precio especial, editar, recálculo del %, bloqueo con anticipo verificado.

### Fase 4: Reserva online y WhatsApp
**Objetivo**: condiciones y fecha límite en `/book` y en el WhatsApp de la reserva. **El despliegue se pregunta.**
**Validación**: Playwright en `/book`; mensaje armado con una sesión falsa.

### Fase 5: Validación final y documentación
- [x] `npx tsc --noEmit`, `npx eslint` de lo tocado y `npm run build:next`
- [x] Criterios de éxito cumplidos
- [x] Manual, memoria, despliegues en Tasknic y comentario en TUR0007

---

## Cómo quedó

- **Base de datos:** 093 (columnas, `deposit_amount_for`, `deposit_due_from`, `compute_appointment_deposit` y
  `guard_appointment_deposit` ampliados, RPC `set_appointment_terms`, vista y reserva pública) y 094 (si el plazo ya
  pasó al reservar, la fecha límite es la hora del turno; decisión de Claudia).
- **App:** Servicios (plazo y condiciones), alta del turno con «Precio y condiciones» plegable (dueño/admin), ficha
  con precio del turno, % y fecha límite del anticipo, bloque «Condiciones» y hoja de edición (`AppointmentTerms.tsx`),
  «Anticipo vencido» en ficha y lista, `/book` con plazo y condiciones.
- **Edge:** `public-booking` v8, `wa-send` v37.
- **Manual:** sección nueva «Cambiar el precio o las condiciones de un turno» + 6 secciones tocadas; `deposit.webp`
  rehecha.

## Aprendizajes

### 2026-10-21: el plazo «horas antes» puede caer en el pasado
- **Error**: con `GREATEST(plazo, now())` una reserva para mañana con plazo de 24 h quedaba vencida al instante.
- **Fix**: 094, el plazo pasa a ser la hora del turno (decisión de negocio, preguntada).
- **Aplicar en**: cualquier fecha derivada «X antes del turno» (recordatorios de pago de TUR0009).

### 2026-10-21: los tipos generados no admiten NULL en argumentos de RPC
- `supabase gen types` declara cada argumento como obligatorio y no nulo aunque la función SQL acepte NULL. Para
  `set_appointment_terms` los argumentos se arman y se convierten una vez a su tipo `Args`, con un comentario.

### 2026-10-21: el MCP de Playwright estaba ocupado
- Se probó con `ui.cjs` (puppeteer-core + Chrome local, en el scratchpad): login, `go`, `click` por texto, `fill` por
  etiqueta (setter nativo + eventos para React) y `shot` a webp. Sirve también para las fotos del manual.
