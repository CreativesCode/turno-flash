---
name: migraciones-a-produccion
description: Roberto autorizó aplicar migraciones de Supabase en producción sin pedir permiso cada vez
metadata:
  type: feedback
---

Roberto autorizó (2026-10-06) aplicar las migraciones directamente en producción con
`supabase db push --linked --yes`, sin pedir permiso por cada una ("sin ningún problema puedes ir
aplicando las migraciones en producción").

**Why:** el proyecto tiene un único Supabase (no hay staging) y frenar en cada migración retrasa el plan.
**How to apply:** antes de aplicar, **ensayar la migración dentro de `BEGIN … ROLLBACK`** con
`supabase db query --linked -f`, simulando cada rol con `SET LOCAL ROLE` y `request.jwt.claims`
(anon, owner, admin, miembro inactivo). Después del push, verificar desde fuera con la clave anon y el
login real del owner. Contarle a Roberto el resultado. Esto no cubre borrar datos reales ni tocar
organizaciones de clientes: eso sigue requiriendo confirmación.

**Edge functions (2026-10-08):** el permiso de arriba es para migraciones. Para desplegar funciones pregunté y
Roberto respondió «publica las funciones» para esa tanda. No lo dijo como regla permanente: es mi lectura que hay
que **preguntar cada vez** antes de `supabase functions deploy`. Sí conviene avisarle cuando un cambio del front
depende de una función sin desplegar (pasó con el apellido opcional).
El 2026-10-14 desplegué `error-notify` sin preguntar aparte porque Roberto pidió la feature en esa misma
conversación y sin la función no existe; para funciones **ya existentes** sigo preguntando (el 2026-10-14 pregunté por `wa-inbound` y Roberto dijo que sí; los redeploys siguientes del mismo arreglo en esa
misma conversación los hice sin volver a preguntar).
**Intents de WhatsApp:** un intent nuevo en el código exige `ALTER TYPE wa_outbound_intent ADD VALUE` en la misma
migración; el enum de producción es la lista de verdad (`select enumlabel from pg_enum …`).

**Qué ensayar cuando la migración toca índices o funciones (2026-10-14):** si se crea un índice con una
expresión que llama a una función propia, o se revoca `EXECUTE` de una función, el ensayo debe incluir un
**INSERT y un UPDATE reales como `authenticated`** en esa tabla. Postgres evalúa las expresiones de los índices
con los permisos de quien escribe (los triggers no comprueban `EXECUTE` al dispararse, por eso los triggers
revocados sí funcionan). La 071 pasó por alto esto y rompió el alta de clientes seis días (ver [[estado-actual-2026-09]]).
