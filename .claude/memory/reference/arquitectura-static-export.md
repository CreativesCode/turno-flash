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


## Reglas de seguridad de la migración 048 (2026-10-06)

- **Vistas siempre con `security_invoker = true`** y sin GRANT a `anon`. Al recrear `organizations_with_license_status` (el patrón 023/035/040 de "recrear la vista al agregar una columna") hay que repetir el `ALTER VIEW … SET (security_invoker = true)`, o la vista vuelve a saltarse RLS.
- **Funciones nuevas:** `SECURITY INVOKER` salvo que haga falta lo contrario; si son DEFINER, `SET search_path` y `REVOKE … FROM PUBLIC, anon`.
- **Un miembro inactivo** (`user_profiles.is_active = false`) no ve su propia fila de perfil, y por eso todas las políticas por organización dejan de aplicarse. No reescribir esas políticas: el corte está en `profiles_select_own_active`.
- Helpers: `is_platform_admin()` y `auth_user_org_id()` (solo perfiles activos).

## Grupo de rutas `(app)` y páginas públicas (2026-10-06, P2-02)

- `AuthProvider` y `NativeBackButton` viven en `app/(app)/layout.tsx`, **no** en el layout raíz.
  Dentro de `(app)` están la landing, login, registro, `auth/`, `help` y todo `dashboard/` (las URLs no cambian).
  Fuera quedan `/book`, `/trips`, `privacy`, `terms` y `account-deletion`: **no pueden usar `useAuth`** (no hay provider).
- **Una ruta nueva que necesite sesión va dentro de `app/(app)/`.** Una página pública nueva va fuera y no debe importar
  `utils/supabase/client` ni el barril `@/hooks` (arrastran supabase-js y Capacitor).
- Zod no se puede reducir con Turbopack (ni con `zod/mini`): en las páginas públicas el esquema del cliente se carga con
  `import()` al abrir el paso "Tus datos" (`components/booking/BookingSteps.tsx`).
- **Build en Windows (P2-08):** Next escribe los archivos de navegación en subcarpetas (`__next.!KGFwcCk/dashboard.txt`)
  y el cliente los pide con puntos; sin arreglo, cada toque del menú recarga la página. `scripts/fix-windows-export.mjs`
  corre después de `next build` en `build` y `build:next` y crea las copias. En Linux (Vercel) no hace nada.
- Al mover carpetas de `app/` en Windows hay que **parar `npm run dev`** (bloquea los directorios), y después borrar
  `.next/dev` porque sus tipos generados apuntan a las rutas viejas y rompen `tsc`/el build.

