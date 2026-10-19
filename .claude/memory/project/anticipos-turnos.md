---
name: anticipos-turnos
description: Anticipos en turnos (TUR0003, PRP-006) — cómo funcionan, dónde vive cada regla y qué falta probar
metadata:
  type: project
---

**Hecho el 2026-10-19** (Claudia; plan en `.claude/PRPs/prp-appointment-deposits.md`). En producción: migraciones
**090-092**, `public-booking` v7, `wa-send` v36, `wa-inbound` v49. **Falta probarlo con un WhatsApp real**
(«PAGUÉ» y la foto del comprobante en `wa-inbound`, que exige la firma del webhook).

- **Por servicio:** `services.deposit_type` (`fixed`|`percent`) + `deposit_value` (CHECK: fijo ≤ precio, % 1-100).
  El importe se calcula **al crear el turno** (`service_deposit_amount`, redondeo a enteros) y queda en
  `appointments.deposit_amount`; cambiar el servicio después no lo toca.
- **Estados** (`appointment_deposit_status`): pending → requested (WhatsApp con instrucciones enviado) → paid (el
  cliente dijo PAGUÉ o mandó foto) → verified (el dueño; `deposit_verified_by/_at`), + cancelled y refunded.
- **Sin pago no hay confirmación** (decisión de Claudia): el trigger `compute_appointment_deposit` deja el turno
  `pending`; `guard_appointment_deposit` impide confirmarlo sin `verified` (`deposit_not_verified`) y que alguien
  toque los campos del anticipo salvo por la RPC `set_appointment_deposit(id, 'verify'|'waive'|'refund')` (solo
  owner/admin; verificar o perdonar confirma el turno) o las edge (rol `service_role`). Cancelar un turno con el
  anticipo sin cobrar → `cancelled`. No hay vencimiento automático.
- **Alta desde el panel:** el dueño elige «Falta cobrarlo», «Ya lo cobré» (`deposit_status: 'verified'`) o «Sin
  anticipo esta vez» (`deposit_waived`). El empleado no puede ni lo uno ni lo otro: le queda pendiente.
- **Instrucciones de pago:** `business_settings.deposit_instructions`, compartidas con pasajes. Negocios de solo
  turnos las editan en la tarjeta `DepositInstructionsCard` de Ajustes.
- **WhatsApp:** `confirm` de un turno con anticipo lleva importe + instrucciones y pasa el anticipo a `requested`
  (solo si OpenWA responde OK); `approved` dice «Recibimos tu anticipo» si está verificado (lo dispara el trigger de
  siempre al pasar pending → confirmed); intents nuevos `deposit_paid_ack` y `notify_business_deposit_paid` (092).
  `wa-inbound`: `isPaymentNotice` («pagué», «ya transferí», «pago hecho»…; «no pagué» no) y fotos/archivos → `paid`
  si el turno debe un anticipo; si no, las fotos se ignoran como antes.
- **Panel:** `appointments_with_details` incluye las columnas del anticipo desde la 091 (la vista tenía las
  columnas congeladas); `DepositPanel` en la ficha; «Falta anticipo» en la lista.
- **Fuera de esta tarea:** reportes de anticipos, cobro dentro de la app, cancelación automática.
