---
name: arquitectura-static-export
description: Restriccion arquitectonica clave — static export para Capacitor: sin API routes ni middleware; el backend vive en Supabase (RLS + Edge Functions)
metadata:
  type: reference
---

**La restriccion que condiciona todo el proyecto:** `next.config.ts` usa
`output: "export"` porque Capacitor necesita HTML estatico en `out/`.

Consecuencias, y son absolutas:

- **NO hay API routes** (`app/api/` esta vacio) ni **route handlers** ni **middleware**
  ni Server Actions ni SSR. Todo el runtime de Next es cliente.
- La autenticacion es 100% client-side (`contexts/auth-context.tsx`, `hooks/use-auth.ts`).
  Los guards de UI (`components/protected-route.tsx`, `components/license-gate.tsx`) son
  **cosmeticos**: se pueden esquivar desde devtools.
- **La seguridad real esta en la base de datos**: RLS de Supabase. Cualquier regla de
  negocio que deba ser inviolable va en RLS o en una funcion `SECURITY DEFINER` que
  verifique permisos por dentro (patron de `get_my_organization_license_status`, migracion 008).
- Lo que necesita servidor va en **Supabase Edge Functions** (`supabase/functions/`):
  `self-signup`, `invite-user`, `delete-account`, `revenuecat-webhook`, `send-reminders`,
  `daily-summary`, `wa-send`, `wa-inbound`, `wa-campaign` (+ `_shared/`).
- Los jobs programados son **pg_cron** dentro de Postgres (migracion 025), no cron de Vercel.
- `images.unoptimized: true` — nada de `next/image` optimizado.

**Al implementar cualquier feature:** si el impulso es "creo un route handler /api/x",
la respuesta correcta es *edge function o RPC de Postgres*. Si es "lo valido en el cliente
antes de guardar", la respuesta correcta es *ademas, RLS*.

Ver [docs/CORRECCION-capacitor.md](../../docs/CORRECCION-capacitor.md).
Relacionado: [[producto-y-dominio]], [[convenciones-de-codigo]], [[license-enforcement]].
