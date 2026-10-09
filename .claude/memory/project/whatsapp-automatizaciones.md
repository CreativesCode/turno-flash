---
name: whatsapp-automatizaciones
description: Capa de WhatsApp (OpenWA) — recordatorios, resumen diario, valoraciones, reactivacion y waitlist; que corre solo y que se configura por negocio
metadata:
  type: project
---

WhatsApp es el canal de comunicacion del producto. Proveedor: **OpenWA** (sesion por
negocio, no Twilio ni la API oficial). Migraciones 014, 016-019, 024, 025.

## Piezas

- **Edge functions**: `wa-send` (saliente, por *intent*: reminder, rating_request,
  rating_ack, waitlist_slot...), `wa-inbound` (entrante: parsea confirmaciones y
  valoraciones 1-5, guarda rating + feedback), `send-reminders`, `daily-summary`,
  `wa-campaign` (reactivacion de clientes inactivos).
- `wa-inbound` tiene **`verify_jwt = false`** en `supabase/config.toml` (es webhook publico;
  la firma se verifica dentro).
- **Crons (pg_cron, migracion 025)**: `wa-reminders` y `wa-daily-summary` cada 15 min.
  Antes de la 025 los recordatorios **no corrian solos**.
- **Triggers**: pedir valoracion al completar un turno; avisar de hueco liberado a waitlist.

## Configuracion por negocio (`business_settings`)

| Columna | Default | Que hace |
|---|---|---|
| `whatsapp_integration_enabled` / `openwa_session_id` | — | Conexion de la sesion de WhatsApp |
| `enable_rating_request` | `true` | Pide valoracion al completar el turno |
| `enable_daily_summary` | `false` (opt-in) | Resumen matutino al telefono de la org |
| `daily_summary_time` | `07:00` (hora local de la org) | Hora del resumen |

UI de estos toggles: `/dashboard/settings` (owner/admin con org).

**Throttle de reactivacion:** `customers.last_reactivation_sent_at` — maximo 1 mensaje por
cliente cada 30 dias y 50 por envio, validado tambien en servidor. No lo saltes.

**Turnos `pending` (reserva web de servicios con aprobacion), desde 2026-09-10:** el `confirm` dice
"solicitud recibida" y no pide OK; si el cliente responde OK igual, `wa-inbound` solo registra
`client_confirmed_at` y **no cambia el estado** (aprobar es del negocio). Cuando el dueno aprueba
(`pending` → `confirmed`), el trigger de la migracion 032 envia el intent `approved` ("aprobo tu
solicitud, tu turno esta confirmado" + opcion CANCELAR); idempotente por turno.

**OpenWA responde HTTP 500 a `send-text` aunque entrega el mensaje** (visto 2026-09-11; el ultimo envio
con respuesta OK fue 2026-06-14; session id de la org de prueba correcto). Efectos: filas `failed` sin
`message_id`, acks sin actualizar, y los recordatorios pueden llegar 2 veces (ventana de 30 min, cron
cada 15, `reminder_sent_at` solo se marca con exito). Es del servidor OpenWA, no del codigo.
Causa documentada en el FAQ de OpenWA (docs/12-troubleshooting-faq.md): WhatsApp Web 2.3000.x renombro
el id interno del mensaje que lee whatsapp-web.js; OpenWA lo arregla con el parche
`scripts/patch-wwebjs-201832.js` (se aplica al instalar y puede perderse al reconstruir). Fix en el
servidor: verificar/reaplicar el parche o actualizar OpenWA (`git pull` + `docker compose up -d --build`;
0.23.4 del 2026-09-05 corrige otro campo renombrado). OJO: en junio los 500 a `5452564206` eran reales
(numero con codigo 54 de Argentina, no existe en WhatsApp).

**Como `wa-inbound` ubica el turno de una respuesta (desde 2026-09-11):** `resolveChatIds` traduce el
remitente (a veces alias `@lid`) a nuestros `chat_id` via message_ids viejos o sufijo del numero; luego
toma el ultimo mensaje abierto (incl. `approved`) de un turno **aun abierto y no pasado**. Antes elegia
por message_id sin mirar el estado y cancelo un turno viejo de mayo (T-0022) en vez del nuevo.
Verificado en real 2026-09-11: el CANCELAR del cliente cancelo el turno correcto (T-0036).
Limite: un cliente nuevo que responde desde `@lid` sin mensajes previos con id no se puede ubicar.

Docs: [docs/REMINDERS-SETUP.md](../../docs/REMINDERS-SETUP.md), [docs/PLAN-DASHBOARDS-Y-MEJORAS.md](../../docs/PLAN-DASHBOARDS-Y-MEJORAS.md).
Relacionado: [[producto-y-dominio]], [[arquitectura-static-export]].

**Viajes (`wa-trip-send`, migraciones 043-047):** reserva recibida, aviso al negocio (solo reservas
web), aprobada, anticipo cobrado, reserva cancelada y salida cancelada. Un envío por intent por
reserva. Detalle en [[modulo-reserva-asientos]].

**HTTP 500 de OpenWA no es fallo de entrega (confirmado por Roberto 2026-10-06):** el servidor OpenWA
responde 500 por un error propio, pero **los mensajes llegan todos**. Por eso `wa_messages` puede
mostrar `HTTP_500` aunque el cliente si recibio el WhatsApp.
**How to apply:** no reportar esos 500 como "WhatsApp no entrega" ni agregar reintentos por ese codigo
(reintentar duplicaria mensajes). Para verificar entrega, preguntar a Roberto o mirar el telefono.

**Quién puede llamar a las funciones de WhatsApp (2026-10-06, P0-02):** `wa-trip-send`, `send-reminders`
y `daily-summary` solo aceptan el **service role** (triggers por pg_net y crons, que ya envían la clave
de `app_config`). `wa-send` acepta el service role para todos los intents, y el JWT de un usuario **solo
para `reminder_manual`** de un turno que ese usuario puede ver por RLS. El control está en
`supabase/functions/_shared/auth.ts` (lee el `role` del JWT; la firma ya la verificó el gateway con
`verify_jwt = true`). **Una función nueva que mande WhatsApp debe usar el mismo control.**

**Ojo, claves de servicio (2026-10-06):** dentro de las Edge Functions, `SUPABASE_SERVICE_ROLE_KEY` es
una clave **nueva** (`sb_secret_...`, 41 caracteres), **no un JWT**; la de `app_config` (triggers y crons)
sí es JWT. Por eso `isServiceRole` (`_shared/auth.ts`) acepta las dos: rol `service_role` en el JWT o
igualdad exacta con la clave del entorno. Un control que solo mire el JWT rompe las llamadas entre
funciones (wa-inbound → wa-send, send-reminders → wa-send). Pasó el 2026-10-06 durante ~3 h.
**Respuestas desde `@lid`:** el alias se traduce con `message_id` antiguos que lo contienen (de antes del
500 de OpenWA, junio). Un cliente cuyo alias nunca apareció en un `message_id` no se puede ubicar.

**Formato de los mensajes al cliente (2026-10-06, pedido por Roberto):** todos pasan por
`frameCustomerMessage` (`supabase/functions/_shared/wa-message.ts`). Arriba va el nombre del negocio y
abajo la nota "_Mensaje automático de Turno Flash_", con lo que ese número acepta (OK/CANCELAR, 1-5 o
nada). La línea **"💬 ¿Dudas? Escribe a {contact_name} al {whatsapp_phone}" solo va donde el cliente
puede necesitar a una persona**: confirm, clarify, clarify_which, cancel_ack, waitlist_slot, trip_booked,
las dos cancelaciones de viaje y wa-campaign. No va en recordatorios, agradecimientos, valoraciones ni
avisos al negocio. La política vive en `CUSTOMER_FRAME` (wa-send) y `PASSENGER_FRAME` (wa-trip-send).
**Why:** el número que envía es automático y solo entiende palabras clave. Si el cliente le escribe
cualquier otra cosa, no le llega a nadie, y si se acostumbra a escribir ahí, se pierden mensajes.
**How to apply:** un mensaje nuevo al cliente debe pasar por el marco y decidir `contact`. Nunca escribir
"responde a este mensaje" ni "escríbenos" sin dar el contacto. El contacto (`organizations.contact_name` y
`whatsapp_phone`, migración 057) lo edita el dueño en Ajustes › Contacto para tus clientes.

## Cambios del cierre de P3 (2026-10-08, desplegados)

- **Respuestas del cliente (`wa-inbound`, `classifyReply`):** un 👍, 👌 o ✅ solo (con cualquier tono de piel)
  confirma. Una **nota de voz** (`type` `ptt` o `audio`) ya no se ignora: sigue como respuesta ilegible y recibe el
  `clarify` de siempre (máximo 1 cada 12 h por turno). El resto de los tipos que no son `chat` se siguen ignorando.
- **Idempotencia:** si el procesamiento falla, se borra la fila de `wa_processed_events` antes de responder 500;
  sin eso, el reintento de OpenWA se descartaba como duplicado.
- **Alerta «WhatsApp desconectado»:** `notifications.user_id` es NOT NULL, así que se inserta una fila por cada
  dueño del negocio (antes el insert fallaba en silencio). Nada en la app muestra todavía esa tabla.
- **Aviso al negocio de turno nuevo:** el trigger `trigger_wa_send_on_appointment` manda `notify_business_new`
  **solo si `source = 'web'`** (migración 071). Los turnos que carga el negocio no lo avisan.
- **Resumen diario:** usa la moneda del negocio (`organizations.currency`), agrega «Hoy salen N viajes con M
  pasajeros» si tiene el módulo de viajes, y no sale si la licencia está vencida. **No se reintenta** un resumen
  «failed»: OpenWA responde 500 y entrega, así que reintentar lo duplicaría (decisión tomada, no reabrir).
- **Campañas:** `wa-campaign` responde 403 a un dueño con la licencia vencida.
- **Envío manual desde el panel:** `AppointmentService.sendReminder` trata `code: "HTTP_500"` como enviado y, para
  cualquier otro fallo, muestra un texto en español. En Plataforma el contador dice «sin confirmar entrega», no
  «fallidos». De 205 filas `failed`, 189 son ese `HTTP_500`.
- **Importes en los mensajes:** siempre con separador de miles (`useGrouping: "always"`).
- **Sin probar con teléfono real:** el 👍, la nota de voz y el resumen con viajes. El clasificador sí se probó con
  14 respuestas de ejemplo.
