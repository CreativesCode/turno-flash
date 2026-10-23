# PRP-009: Recordatorios y avisos de pago (TUR0009)

> **Estado**: HECHO (2026-10-23, en producción y subido; TUR0009 en «En revisión»)
> **Fecha**: 2026-10-23
> **Proyecto**: Turno Flash
> **Tarea**: TUR0009 «Añadir recordatorios de pago y comunicaciones» (estimación 2-3 días)
> **Base**: PRP-006 (anticipos), PRP-007 (precio, plazo y condiciones), PRP-008 (pagos de cada turno)

---

## Objetivo

El cliente recibe por WhatsApp un **recordatorio 24 h antes de que venza el plazo del anticipo**, un **aviso de
anticipo vencido** (que también le llega al dueño) y un **acuse de cada pago que el negocio registra en el panel**.
Cada negocio puede apagar estos avisos con un interruptor en Ajustes.

## Por Qué

| Problema | Solución |
|----------|----------|
| El cliente se olvida de pagar el anticipo y el dueño tiene que perseguirlo a mano | Recordatorio automático 24 h antes del plazo, con importe, plazo, cómo pagar y número de turno |
| Al vencer el plazo no pasa nada: solo aparece «Anticipo vencido» en el panel si el dueño lo mira | Aviso al cliente y al WhatsApp del negocio en el momento en que vence |
| El cliente no tiene constancia de lo que pagó (en efectivo o por transferencia) | Acuse por WhatsApp con lo pagado y lo que falta |
| Hay negocios que prefieren cobrar a su manera, sin mensajes | Interruptor «Recordatorios y avisos de pago» por negocio |

**Valor de negocio**: menos turnos bloqueados esperando un anticipo, menos mensajes manuales del dueño y más
confianza del cliente (comprobante de cada pago).

## Qué

### Pedido (Claudia, 2026-10-23)
- Recordatorio **24 h antes del límite del anticipo**.
- Aviso de **vencido al cliente y al dueño**.
- **Acuse de cada pago registrado en el panel**.
- **Interruptor por negocio** en Ajustes.

### Supuestos (corregir si no encajan)
- **Un solo interruptor** cubre los tres avisos. **Encendido por defecto** (también para los negocios que ya existen);
  solo actúa en negocios con WhatsApp conectado y licencia usable, como el resto de mensajes.
- Lo que **ya existe no cambia ni depende del interruptor**: el mensaje de reserva con el anticipo, «PAGUÉ» y su
  respuesta, y «Recibimos tu anticipo, tu turno está confirmado».
- **Recordatorio de 24 h:** solo si el anticipo se sigue debiendo (pendiente o pedido; si el cliente ya dijo PAGUÉ no
  se le recuerda) y solo si el cliente tuvo más de 24 h para pagar. Si reservó con menos margen, el mensaje de la
  reserva ya le dijo el plazo y no se le repite. Un solo recordatorio por plazo.
- **Vencido:** un solo aviso a cada uno (cliente y negocio) por plazo. **El turno no se cancela solo** (sigue la
  decisión de PRP-007): el mensaje al cliente le dice que el turno sigue pendiente y cómo pagar o con quién hablar; el
  del dueño le recuerda que puede cancelarlo, cambiar el plazo o perdonar el anticipo. No se avisa si el turno ya pasó
  o está cancelado.
- **Si el dueño cambia el plazo** (o mueve el turno), los avisos vuelven a valer para el plazo nuevo.
- **Acuse de pago:** sale con cada pago registrado (dueño o empleado), con importe, método, total pagado, lo que falta
  y el número de turno. **Excepción:** si el pago es el anticipo y con él se confirma el turno, no se manda acuse
  aparte: ya sale «Recibimos tu anticipo, tu turno está confirmado» (evita dos mensajes seguidos).
- **Anular un pago no manda mensaje** al cliente.
- Al activar esto no se avisa de golpe por anticipos vencidos hace tiempo: el aviso de vencido solo sale si venció en
  las últimas 24 h.
- Fuera de esta tarea: recordatorio de saldo pendiente (no anticipo), devoluciones (TUR0010), panel e informes
  (TUR0011), pasajes (tienen su propio flujo) y cobro con pasarela (TUR0012).

### Criterios de Éxito
- [x] Un turno con anticipo pendiente y plazo dentro de 24 h recibe un único recordatorio con importe, plazo,
      instrucciones de pago, condiciones si las hay y su número de turno (`PAGUÉ <número>` / `CANCELAR <número>`).
- [x] Al vencer el plazo sin pago, el cliente y el WhatsApp del negocio reciben un único aviso cada uno.
- [x] Cambiar el plazo de un turno permite un recordatorio y un aviso de vencido nuevos para ese plazo.
- [x] Registrar un pago en el panel manda al cliente un acuse con lo pagado y lo pendiente; un pago del anticipo que
      confirma el turno no duplica el mensaje de confirmación.
- [x] Con el interruptor apagado, ninguno de los tres avisos sale; el resto de WhatsApp sigue igual.
- [ ] Responder `PAGUÉ` o `CANCELAR` al recordatorio o al aviso de vencido funciona como con el mensaje de reserva.
- [x] Un negocio bloqueado o sin WhatsApp no envía nada (como hoy).
- [x] Manual de usuario actualizado (texto y, si cambia Ajustes, foto).

### Comportamiento Esperado
1. Ana reserva el martes un corte con anticipo de 500 CUP a pagar antes del jueves 10:00. Recibe el mensaje de reserva
   de siempre.
2. El miércoles hacia las 10:00 le llega: «Te recordamos el anticipo de *500 CUP* del turno N° ES-0012, antes del
   *jueves 10:00*» + instrucciones + «responde PAGUÉ ES-0012…».
3. Si no paga, el jueves a las 10:00 (±15 min) Ana recibe «El plazo para pagar el anticipo venció; tu turno sigue
   pendiente…» con el contacto del negocio, y el negocio recibe «⏰ Anticipo vencido: Ana …, N° ES-0012. Puedes
   cancelarlo, darle más plazo o perdonar el anticipo desde el turno».
4. Ana paga en efectivo 500 CUP; el dueño lo registra como anticipo → turno confirmado → le llega solo «Recibimos tu
   anticipo, tu turno está confirmado» (como hoy).
5. El día del turno paga el resto (1 000 CUP) y el empleado lo registra → a Ana le llega «Recibimos tu pago de
   1 000 CUP (efectivo) del turno N° ES-0012. Pagado: 1 500 CUP. Pendiente: 0».
6. Un negocio con el interruptor apagado no manda 2, 3 ni 5.

---

## Contexto

### Lo que ya hay
- **Envío:** `supabase/functions/wa-send` (un *intent* por mensaje; marco del cliente con `CUSTOMER_FRAME` y
  `frameCustomerMessage`; idempotencia por `wa_outbound_messages`; `notify_business_*` va a `organizations.whatsapp_phone`;
  ya calcula importe, plazo en la zona del negocio e instrucciones del anticipo para `confirm`, reutilizable).
- **Cron:** `send-reminders` cada 15 min (025) con ventanas por RPC (`wa_appointments_in_window`, 051, que solo mira
  turnos confirmados: un turno que debe anticipo está `pending` y hoy no recibe recordatorios de turno).
- **Desde la BD:** triggers que llaman a `wa-send` por `pg_net` con la clave de `app_config` (patrón de
  `trigger_wa_send_on_appointment`, 071, y del `approved`, 032).
- **Pagos:** `appointment_payments` + `register_appointment_payment` (095): si el pago es el anticipo y lo registra
  el dueño, verifica y confirma el turno → dispara `approved`.
- **Respuestas:** `wa-inbound` solo atribuye una respuesta a los intents de `OPEN_INTENTS` (y en la lista del
  prefijo, ~línea 748).
- **Ajustes:** `app/(app)/dashboard/settings/page.tsx` (`SettingRow` de valoración y resumen diario) +
  `hooks/useBusinessSettings.query.ts`.
- **Panel:** `depositOpen` / `depositOverdue` en `ApptRow` y `DepositPanel` (no cambian).

### Arquitectura propuesta
```
supabase/migrations/096_payment_reminders.sql
  - business_settings.enable_payment_reminders BOOLEAN NOT NULL DEFAULT true
  - wa_outbound_intent + deposit_due_reminder, deposit_overdue,
    notify_business_deposit_overdue, payment_received
  - appointments.deposit_reminder_sent_at / deposit_overdue_sent_at
    (se vacían si cambia deposit_due_at → los avisos valen por plazo)
  - appointment_payments.ack_sent_at (idempotencia del acuse)
  - RPC(s) de servicio: anticipos con plazo en las próximas 24 h / vencidos en las últimas 24 h
  - trigger AFTER INSERT en appointment_payments → wa-send payment_received (pg_net)
supabase/functions/send-reminders   → dos lotes más (recordatorio y vencido)
supabase/functions/wa-send          → 4 intents nuevos, paymentId opcional, respeta el interruptor
supabase/functions/wa-inbound       → los 2 intents al cliente en OPEN_INTENTS
app/(app)/dashboard/settings/page.tsx + hooks/useBusinessSettings.query.ts → interruptor
docs/user-manual/ (+ /help) → sección de anticipos y pagos
```

### Modelo de datos (borrador)
```sql
ALTER TABLE business_settings ADD COLUMN enable_payment_reminders BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE appointments
  ADD COLUMN deposit_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN deposit_overdue_sent_at  TIMESTAMPTZ;   -- reset when deposit_due_at changes
ALTER TABLE appointment_payments ADD COLUMN ack_sent_at TIMESTAMPTZ;
-- RLS: sin políticas nuevas (tablas existentes); las columnas nuevas solo las escriben las edge (service role).
```

---

## Blueprint

### Fase 1: Base de datos
**Objetivo**: migración 096 con interruptor, intents, columnas de idempotencia (con reinicio al cambiar el plazo),
RPC de selección de anticipos y trigger del acuse de pago.
**Validación**: ensayo en `BEGIN/ROLLBACK` por rol (dueño, empleado, otro negocio): el empleado no puede escribir las
columnas nuevas, el reinicio por cambio de plazo funciona, la RPC devuelve los turnos correctos (con margen > 24 h,
sin pagar, sin cancelar, interruptor encendido).

### Fase 2: Edge Functions
**Objetivo**: `send-reminders` manda recordatorio y vencidos; `wa-send` arma los 4 mensajes (con el marco y el
contacto donde corresponde) y omite si el interruptor está apagado; acuse sin duplicar la confirmación;
`wa-inbound` reconoce las respuestas a los mensajes nuevos.
**Validación**: llamar a las funciones desde fuera con un negocio desechable (memoria «Tooling») y revisar
`wa_outbound_messages`; repetir la llamada no reenvía. Desplegar se pregunta antes.

### Fase 3: Ajustes, manual y validación final
**Objetivo**: interruptor en Ajustes, manual al día, memoria y entrega.
**Validación**:
- [ ] `npx tsc --noEmit`, `npx eslint` de lo tocado y `npm run build:next`
- [ ] Captura de Ajustes con el interruptor (Playwright/puppeteer)
- [ ] Criterios de éxito cumplidos (incluida una prueba con un WhatsApp real si Roberto/Claudia pueden)
- [ ] Manual, memoria, despliegues y comentario en TUR0009 (a «En revisión»)

---

## 🧠 Aprendizajes (Self-Annealing)

> Esta sección crece con cada error encontrado durante la implementación.

### 2026-10-23: contar en `net.http_request_queue` mide todos los triggers
- **Error**: el ensayo decía que el pago del anticipo del dueño encolaba un acuse; era el `approved` (032) del mismo UPDATE.
- **Fix**: filtrar la cola por el cuerpo (`convert_from(body,'UTF8') LIKE '%payment_received%'`).
- **Aplicar en**: cualquier ensayo de un trigger con `pg_net`.

### 2026-10-23: orden de despliegue cuando un trigger llama a un intent nuevo
- **Error posible**: con la 096 aplicada y el `wa-send` viejo, un pago encolaba `payment_received` y el `wa-send` viejo
  armaba un mensaje vacío; con el `wa-send` nuevo antes de la 096, faltaba la columna del interruptor y se cortaba TODO
  el WhatsApp.
- **Fix**: aplicar la migración y desplegar `wa-send` en el mismo comando, sin pausa (y `wa-inbound` después de la
  migración: filtra por los intents nuevos y sin el enum da 22P02, como en la 081).
- **Aplicar en**: cualquier intent nuevo que dispare un trigger.

### 2026-10-23: «una vez por plazo» sin columnas nuevas
- Se lee de `wa_outbound_messages` (mensaje del mismo intent enviado desde `plazo - 24 h` para el recordatorio y desde el
  plazo para el vencido). Mover el plazo unas horas no repite el recordatorio si el último ya cae en la ventana nueva;
  moverlo más allá, sí. Así no hizo falta tocar la guarda del anticipo.

---

## Gotchas

- [ ] `ALTER TYPE ... ADD VALUE` no se puede usar en la misma transacción en la que se crea; los valores nuevos no
      pueden usarse dentro de la misma migración (092 los añadió sin usarlos).
- [ ] Un pago del anticipo registrado por el dueño ya dispara `approved` («Recibimos tu anticipo»): el acuse no debe
      salir también. Si lo registra un empleado, el anticipo queda `paid` (no confirma) y sí sale el acuse.
- [ ] Al encender esto en producción hay anticipos vencidos antiguos: limitar el aviso de vencido a las últimas 24 h.
- [ ] `notify_business_*` usa `organizations.whatsapp_phone`, que debe ir con +53 (memoria de WhatsApp).
- [ ] Toda la flota del piloto comparte una sola sesión OpenWA: `wa-inbound` debe seguir eligiendo el negocio por
      quién escribió por última vez; los intents nuevos deben contar en esa búsqueda.
- [ ] OpenWA responde HTTP 500 y entrega igual: la idempotencia cuenta también las filas `failed`; no reintentar.
- [ ] La función nueva o modificada que mande WhatsApp debe aceptar solo service role (`_shared/auth.ts`).
- [ ] `appointments_with_details` tiene columnas congeladas: si `wa-send` necesita columnas nuevas, añadirlas al
      final de la vista (como 091 y 095) o leerlas de la tabla.
- [ ] Las columnas del anticipo están protegidas por `guard_appointment_deposit`; las nuevas `deposit_*_sent_at` no
      deben entrar en esa guarda pero tampoco deben poder tocarlas los empleados.

## Anti-Patrones

- NO crear un cron ni una función nuevos si `send-reminders` y `wa-send` lo cubren.
- NO reintentar envíos por HTTP 500 de OpenWA.
- NO cancelar turnos automáticamente al vencer (decisión de PRP-007).
- NO hardcodear textos de importe: usar `money()` con la moneda del negocio.

---

## Cómo quedó

- **096** (en producción): interruptor `enable_payment_reminders` (encendido), 4 intents, `appointment_payments.ack_sent_at`,
  RPC `wa_deposits_due_soon()` / `wa_deposits_overdue()` (solo service role) y trigger `trg_wa_payment_received` (no
  manda acuse cuando el dueño registra el anticipo de un turno pendiente: ya sale `approved`).
- **`wa-send` v38**: los 4 mensajes, el interruptor, «una vez por plazo» y por pago (marca `ack_sent_at` también si
  OpenWA falla). **`send-reminders` v15**: dos lotes más. **`wa-inbound` v50**: PAGUÉ/CANCELAR a los mensajes nuevos.
- **Ajustes**: «Recordatorios y avisos de pago». **Manual**: anticipo, pagos, tabla de mensajes, automatizaciones y la guía
  del personal.
- **Probado**: ensayo por rol en BEGIN/ROLLBACK y negocio desechable con sesión OpenWA falsa (ya borrado): textos,
  repeticiones, plazo movido, interruptor, acuses y `send-reminders` completo. **Sin probar**: con un WhatsApp real y la
  respuesta PAGUÉ a un recordatorio (`wa-inbound` exige la firma del webhook); la foto de Ajustes no se tomó (el manual no
  tiene foto de esa parte).

