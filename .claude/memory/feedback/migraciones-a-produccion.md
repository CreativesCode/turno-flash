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
