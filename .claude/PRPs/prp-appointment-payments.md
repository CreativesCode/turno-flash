# PRP-008: Estado económico y pagos de cada turno (TUR0008)

> **Estado**: COMPLETADO (2026-10-21) — entrega pendiente (pausa 2026-10-22)
> **Fecha**: 2026-10-21
> **Proyecto**: Turno Flash
> **Tarea**: TUR0008 «Gestionar estado económico y pagos de cada reserva» (estimación 3-5 días)
> **Base**: documento «Definición de la configuración del Módulo Finanzas», PRP-006 (anticipos) y PRP-007 (precio y condiciones)

---

## Objetivo

Cada turno muestra su **estado económico** (precio, anticipo, pagado, pendiente y estado) y guarda la **lista de
sus pagos**, registrados a mano con importe, fecha, método, referencia, observaciones y comprobante. Se admiten
pagos parciales y el anticipo es un pago más.

## Por Qué

| Problema | Solución |
|----------|----------|
| No queda registro de cuánto pagó cada cliente, cuándo ni cómo | Lista de pagos por turno con todos sus datos |
| «Anticipo recibido» no guarda importe, método ni comprobante | El anticipo se registra como un pago |
| No se sabe cuánto falta cobrar de un turno | Pagado y pendiente calculados de los pagos |
| La foto de la transferencia se pierde en el WhatsApp del dueño | Comprobante adjunto al pago, privado |
| Un error al anotar un pago no se puede corregir sin perder el rastro | Anular (no borrar) con motivo, quién y cuándo |

## Qué

### Decisiones tomadas (Claudia, 2026-10-21)
- **Métodos:** Efectivo, Transferencia (Transfermóvil / EnZona), Tarjeta y Otro (con texto). Pasarelas: TUR0012.
- **Comprobante:** foto o archivo adjunto opcional, **privado** (solo lo ve el negocio).
- **Quién:** dueño y empleados registran pagos; **solo el dueño anula** (no se borra nada: queda quién, cuándo y por qué).
- **El anticipo es un pago más:** «Anticipo recibido» abre el registro de pago con el importe del anticipo.

### Supuestos (técnicos o menores; corregir si no encajan)
- **Estado económico** de un turno: *Sin pagar* · *Pago parcial* · *Pagado* (lo pagado cubre el precio). El estado
  del anticipo (PRP-006) sigue aparte.
- Un pago marcado como **anticipo**: si lo registra el **dueño**, el anticipo pasa a *Recibido* (verificado) y el
  turno se confirma, como hoy. Si lo registra un **empleado**, pasa a *Pagado* y espera a que el dueño lo verifique
  (el documento de finanzas pide que «pagado» y «verificado» sean distintos).
- **Anular el pago del anticipo** devuelve el anticipo a *Pendiente*; el turno no cambia de estado.
- Se puede cobrar **más que el precio** (propina, extra): el pendiente queda en 0 y se muestra lo cobrado de más.
- `appointments.was_paid` (que usan los reportes y el CSV) se mantiene sola: verdadero cuando lo pagado cubre el precio.
- Los anticipos ya verificados antes de esto (p. ej. OT-0065) reciben un pago equivalente para que los números cuadren.
- Comprobante: imagen o PDF de hasta 5 MB.
- Fuera de esta tarea: recordatorios de pago (TUR0009), devoluciones con importe y estado (TUR0010), panel e informes
  (TUR0011).

### Criterios de Éxito
- [x] La ficha del turno muestra precio, anticipo, pagado, pendiente y estado económico.
- [x] Dueño y empleado registran un pago con importe, fecha, método (Otro con texto), referencia, observaciones y
      comprobante opcional.
- [x] Varios pagos parciales suman bien; al cubrir el precio el turno queda *Pagado* y `was_paid` se activa.
- [x] «Anticipo recibido» registra el pago del anticipo: dueño → verificado y turno confirmado; empleado → pagado.
- [x] Solo el dueño anula un pago, con motivo; el pago anulado se ve tachado con quién y cuándo, y deja de sumar.
- [x] El comprobante solo lo ven los miembros del negocio (ni otro negocio ni la página pública), y un negocio
      bloqueado no los ve (como 087).
- [x] Un turno sin pagos se ve y funciona como hoy.
- [x] El CSV de turnos incluye pagado y pendiente.
- [x] Manual de usuario actualizado (texto y foto).

---

## Contexto

- Ya existe: `appointments.price_charged` + precio del servicio, `deposit_*` (090-094), RPC
  `set_appointment_deposit`, `DepositPanel`, `appointments_with_details` (columnas nuevas al final, 091),
  `was_paid` (reportes `revenue_paid`, CSV). Pasajes tiene su propio modelo (`amount_paid` +
  `components/trips/PaymentSheet.tsx`) que sirve de referencia visual.
- Storage: patrón del bucket `trip-photos` (066) y su política restrictiva de licencia (087).
- Memoria: `project/anticipos-turnos.md`, `project/license-enforcement.md` (tabla nueva con datos del negocio →
  política RESTRICTIVE de licencia; funciones DEFINER comprueban licencia).

### Modelo de datos (borrador)
```sql
CREATE TYPE appointment_payment_method AS ENUM ('cash', 'transfer', 'card', 'other');

CREATE TABLE appointment_payments (
  id UUID PK, organization_id UUID, appointment_id UUID → appointments ON DELETE CASCADE,
  amount NUMERIC(10,2) > 0, paid_at TIMESTAMPTZ DEFAULT now(),
  method appointment_payment_method, method_other TEXT, reference TEXT, notes TEXT,
  receipt_path TEXT,            -- Storage: appointment-receipts/<org>/<appointment>/<archivo>
  is_deposit BOOLEAN DEFAULT false,
  created_by UUID, created_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ, voided_by UUID, void_reason TEXT
);
-- RLS: leer y registrar = miembros del negocio; anular = RPC de dueño/admin; borrar = nadie.
-- + política RESTRICTIVE de licencia (087).
```
La vista `appointments_with_details` suma lo pagado (sin anulados) y deriva pendiente y estado. RPCs:
`register_appointment_payment(...)` (inserta y, si es anticipo, lo marca pagado/verificado) y
`void_appointment_payment(id, motivo)`.

---

## Blueprint

### Fase 1: Base de datos y Storage
**Objetivo**: tabla, enum, RLS + licencia, bucket privado con sus políticas, RPCs, sincronía de `was_paid`, vista
con pagado/pendiente/estado y migración de los anticipos ya verificados.
**Validación**: ensayo por rol (dueño, empleado, otro negocio, admin, negocio bloqueado) en transacción revertida.

### Fase 2: Ficha del turno
**Objetivo**: bloque «Pagos» (resumen + lista), hoja «Registrar pago» (con comprobante), anular (dueño),
«Anticipo recibido» → registrar pago del anticipo.
**Validación**: Playwright/`ui.cjs` con un negocio desechable: pagos parciales, anticipo por dueño y por empleado,
anular, comprobante.

### Fase 3: Lista, CSV y validación final
**Objetivo**: estado económico visible en la lista, columnas en el CSV, manual, memoria.
**Validación**:
- [x] `npx tsc --noEmit`, `npx eslint` de lo tocado y `npm run build:next`
- [x] Criterios de éxito cumplidos
- [x] Manual (texto y foto), memoria, despliegues en Tasknic y comentario en TUR0008

---

## Entrega (2026-10-23)

- Migración 095 en producción; push a `main` (`fefac01`..`19a2f6a`); comentario en TUR0008 a nombre de Claudia;
  despliegues en Tasknic (`migrations` 095 verificado; `web` sin verificar en Vercel); TUR0008 en `in_review`.

## Cómo quedó

- **Base de datos (095):** tabla `appointment_payments` (solo lectura para los miembros; se escribe solo con las RPC
  `register_appointment_payment` y `void_appointment_payment`, SECURITY DEFINER que comprueban negocio, licencia y rol),
  bucket privado `appointment-receipts` (`<negocio>/<turno>/<archivo>`, imagen o PDF ≤ 5 MB, enlace firmado de 5 min),
  política RESTRICTIVE de licencia en ambos, un solo pago de anticipo activo por turno, `was_paid` sincronizado (también
  al cambiar el precio), vista con `amount_paid`, `amount_pending` y `payment_status`, y pago equivalente para el
  anticipo ya verificado (OT-0065).
- **App:** `AppointmentPayments.tsx` (bloque «Pagos», lista, «Anular» con motivo), `RegisterPaymentSheet.tsx`,
  `DepositPanel` («Anticipo recibido» abre el registro; el empleado ve «Registrar anticipo»; si ya hay pago,
  «Verificar anticipo»), estado del pago en la lista y tres columnas nuevas en el CSV.
- **Manual:** sección nueva «Registrar los pagos de un turno» + foto `payments.webp`; anticipo, CSV, límites y
  personal actualizados.
- **Sin cambios en Edge Functions** (WhatsApp sigue marcando «pagado» con PAGUÉ; el dueño registra el pago después).

## Aprendizajes

### 2026-10-21: refrescar la lista antes de cerrar la hoja
- **Error**: tras «Registrar anticipo» la ficha mostraba los totales nuevos pero la lista de pagos vieja (y el botón
  seguía ahí), porque la invalidación de `appointmentKeys.all` no se esperaba.
- **Fix**: `onSuccess` devuelve la promesa de `invalidateQueries` de la lista de pagos: `mutateAsync` espera a que
  llegue.
- **Aplicar en**: cualquier mutación cuya pantalla dependa de otra query que se debe ver al instante.

### 2026-10-21: tablas que solo se escriben por RPC
- Sin políticas de escritura y con `REVOKE INSERT, UPDATE, DELETE` a `authenticated`; las RPC son DEFINER y por eso
  comprueban a mano `auth_user_org_id()`, `auth_org_usable()` y el rol (como pide 087). Ensayado: escritura directa →
  `permission denied`.

### 2026-10-21: descargar un CSV con puppeteer
- `Browser.setDownloadBehavior` no dejó el archivo en Windows; se leyó el contenido envolviendo
  `URL.createObjectURL` en la página y llamando a `blob.text()`.
