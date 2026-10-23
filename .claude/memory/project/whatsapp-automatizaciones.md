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

**Aviso de errores al admin (2026-10-14, migración 079 + edge `error-notify`):** cada fila **nueva** en
`error_logs` dispara `trg_error_log_notify` → pg_net → `error-notify`, que manda un WhatsApp («⚠️ Turno Flash:
error en producción» con negocio, usuario y rol, pantalla, hora de Cuba, mensaje y primera línea del stack) a los
números del secreto **`ERROR_NOTIFY_PHONES`** (`+5353077035,+5352564206`; si falta, cae a `ADMIN_NOTIFY_PHONE`)
desde la sesión de plataforma `ADMIN_NOTIFY_SESSION_ID`. Solo acepta service role. **Las repeticiones del mismo
error en 24 h no avisan**: `increment_error_count` (065) las suma a la fila existente y el AFTER INSERT no se
dispara; vuelve a avisar si pasan 24 h o si el error se marcó resuelto. Probado en real el 2026-10-14: `sent: 2`.
Para cambiar los números: `supabase secrets set ERROR_NOTIFY_PHONES=...` (sin redeploy).

**Una sola línea para todo el piloto (decisión de Roberto, 2026-10-14):** todos los negocios del piloto se conectan a
la **misma sesión OpenWA** (`ef7074ea-…`, la de «Organización test»); el `openwa_session_id` se copia en
`business_settings` desde el panel de plataforma (`WhatsAppOrgSection`). Consecuencia que ya mordió: `wa-inbound`
buscaba el negocio por sesión con `.single()` y con dos negocios fallaba (PGRST116, «2 rows») y **descartaba todas las
respuestas** (pasó con Espiral Studio de 13:08 a 13:36 UTC; se perdieron 2 respuestas). Desde `wa-inbound` v39
(2026-10-14): lista los negocios de la sesión y, si hay varios, `resolveOrgBySender` elige el que **escribió por
última vez a ese remitente** (reutiliza `resolveChatIds` por negocio); si ninguno le escribió, se ignora. La caída de
sesión avisa a los dueños de todos los negocios de la línea. **Toda función nueva que resuelva negocio por sesión debe
asumir N negocios.** Límite: un cliente al que dos negocios de la línea le escribieron recibe la respuesta en el que
le escribió más recientemente.

**El número de WhatsApp del negocio debe ir con +53:** `notify_business_*` hace `phoneToChatId(org.whatsapp_phone)`
sin código de país, así que un número guardado como `63792397` manda el aviso a un chat inválido y el pie de los
mensajes al cliente lo muestra sin prefijo. El registro lo mandaba crudo (arreglado en `register/page.tsx` el
2026-10-14, pendiente de push). `notify_business_new` **no es idempotente** en `wa-send`: se puede reenviar a mano
con la clave de servicio (`{appointmentId, intent}`), como se hizo con el T-0002 de Espiral.

**Las respuestas de clientes estuvieron rotas para TODOS del 2026-10-06 al 2026-10-14 (enum):** la función de mover
turnos (commit `27be2ce`) añadió el intent `rescheduled` en `wa-send`/`wa-inbound` sin `ALTER TYPE wa_outbound_intent
ADD VALUE`. El filtro `.in("intent", [... "rescheduled"])` fallaba con 22P02, PostgREST devolvía error, `wa-inbound`
ignoraba el `error` y lo leía como «no open appointment». Arreglado con la **081**. **Regla:** cada intent nuevo lleva su
`ADD VALUE` en la misma migración, y al ensayar hay que probar una respuesta real (el OK de Roberto al T-0003 lo confirmó:
`client_confirmed`, `confirm_ack` y `notify_business_confirm` enviados, 2026-10-14 14:16 UTC).

**Remitentes `@lid` (identificador de privacidad de WhatsApp):** los teléfonos de Roberto y de muchos clientes llegan
como `211909458550818@lid`, sin número en el payload (`keys`: from, to, chatId, body, type, timestamp, fromMe,
isGroup). El alias se aprendía de `message_id` (`true_<lid>@lid_<id>`), pero OpenWA no devuelve ids desde el
2026-06-14 (solo 6 teléfonos tienen alias). Desde `wa-inbound` v42: el alias se busca en **todos** los negocios;
si no hay, usa `data.senderPhone` (lo manda el servidor con `RESOLVE_LID_TO_PHONE=true`, apagado por defecto) o
pregunta a `GET /sessions/:id/contacts/:lid/phone` (`resolveContactPhone` en `_shared/openwa.ts`). **Pendiente de
verificar** con un `@lid` desconocido (p. ej. Aicenis respondiendo al T-0001). La línea de la plataforma es un
número de EE. UU. (`15753180319@c.us`).

**Diagnóstico sin logs:** `wa_processed_events.payload` (copia compacta del webhook) y `.result` (qué decidió) desde la
080 / v40. Primera consulta ante «respondí y no pasó nada»:
`select processed_at, result, payload from wa_processed_events order by processed_at desc limit 5`.

**Carga de una sesión más en OpenWA (FAQ 12, 2026-10-14):** motor whatsapp-web.js = un Chromium por sesión, 300-500 MB
RAM (2 GB → 3-5 sesiones; 4 GB → 8-10); motor Baileys, mucho menos. Roberto **no tiene SSH al servidor** por ahora:
seguir con una sola línea compartida hasta recuperarlo; entonces activar `RESOLVE_LID_TO_PHONE=true` y reaplicar el
parche de whatsapp-web.js que devuelve los message ids (quita los HTTP 500).

**Identificación de clientes nuevos por código (2026-10-14, migraciones 082-084, `wa-inbound` v43+, `wa-send`):**
el servidor OpenWA instalado **no tiene** `GET /contacts/:lid/phone` («Cannot GET», confirmado) ni devuelve message
ids, así que un `@lid` nuevo no se puede traducir. Solución propia que funciona para todos:
- **El número de turno lleva el prefijo del negocio** (`organizations.reply_prefix`, 2-4 letras únicas; sin prefijo
  sigue `T-`): `ES-0004` en el panel, en el WhatsApp y en lo que escribe el cliente. Al poner o cambiar el prefijo,
  un trigger renumera los turnos de ese negocio (mismos dígitos). Prefijos hoy: ES Espiral, OT Organización test,
  BD Barbería Demo, DU Dulceria, QAV/QAN/QAB los QA. Se asignan por SQL (no hay UI).
- Los mensajes al cliente muestran «✅ *OK ES-0004*» / «❌ *CANCELAR ES-0004*» y el pie dice «solo entendemos *OK
  ES-0004* y *CANCELAR ES-0004*». `parseReplyCode` acepta `es-4`, `es004`, `ES 0004`, mayúsculas o no; letras
  distintas de T deben ser un prefijo conocido («dale 5» no es código).
- **Remitente desconocido:** si trae código → `chatByAppointmentCode` (turno abierto único con ese número entre los
  negocios de la línea) → actúa y guarda el alias en **`wa_sender_aliases`** (`sender_id` lid → `chat_id`); después
  le basta «OK». Si no trae código → `askForCode` le pide el código (ejemplo con el prefijo del negocio que escribió
  último en la línea; **responder a un `@lid` sí funciona** en este servidor), máx. 1 vez por 12 h.
- Verificado en real: Aicenis («OK» a secas tras aprender el alias), Roberto (alias de junio) y +5350625804 hecho
  desconocido a propósito (alias borrado + message_ids a NULL): «Ok» → aviso; «Ok es-6» → confirmado + alias.
- Manual (`docs/user-manual/turno-flash-user-manual.html`) actualizado con el ejemplo `EN-0042`.

**Negocio bloqueado = sin WhatsApp (2026-10-16, D-10):** `wa-send` (v35), `wa-trip-send` (v11) y `wa-inbound` (v48)
consultan `org_license_usable` y salen con `license_blocked` (en `wa-inbound` queda en `wa_processed_events.result`
como `skip: license_blocked`), igual que `daily-summary` y `wa-campaign`. `license-notices` **no** se corta: es
el aviso al dueño de cómo pagar. Ver [[license-enforcement]].

**Anticipos de turnos (2026-10-19, TUR0003):** `wa-send` v36 y `wa-inbound` v49; intents `deposit_paid_ack` y
`notify_business_deposit_paid` (092). Al añadir un intent, **siempre** el `ALTER TYPE wa_outbound_intent ADD VALUE`
antes de publicar la función (lección de la 081). Pie del mensaje con anticipo: modo `deposit` de
`frameCustomerMessage`. Ver [[anticipos-turnos]].


**Avisos de pago (2026-10-23, TUR0009, 096):** `wa-send` v38, `send-reminders` v15, `wa-inbound` v50. Intents
`deposit_due_reminder`, `deposit_overdue`, `notify_business_deposit_overdue` (cron cada 15 min) y `payment_received`
(trigger en `appointment_payments`). **Orden de despliegue de un intent que dispara un trigger:** migración y `wa-send`
en el mismo comando, `wa-inbound` después de la migración. Ver [[anticipos-turnos]].
