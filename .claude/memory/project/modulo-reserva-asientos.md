---
name: modulo-reserva-asientos
description: Idea aprobada (sin empezar) de un modulo aparte para vender asientos de guagua con salidas por dia y sena; que se reutiliza y que es nuevo
metadata:
  type: project
---

**Estado: IDEA APROBADA, SIN EMPEZAR** (decidido 2026-09-10). Hacerlo cuando el usuario lo pida, empezando
por un PRP (skill `prp`), no directo a codigo.

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

## Preguntas abiertas para el usuario

- ¿El viaje puede durar varios dias o "x dias" es la anticipacion con la que se reserva?
- ¿El cliente elige asiento concreto o solo la cantidad?
- Monto de la sena (fijo o %) y politica si cancela (¿se devuelve?).
- ¿Que pasa si no paga la sena a tiempo (se libera la plaza)?

Relacionado: [[producto-y-dominio]], [[reserva-online]], [[whatsapp-automatizaciones]].
