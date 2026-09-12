---
name: turno-flash-tooling
description: "Datos de tooling de turno-flash — CLI de Supabase enlazado sin npx, lint roto, regeneración de tipos"
metadata:
  type: project
---

En turno-flash (gestión de turnos, Next.js 16 + Supabase + Capacitor):

- El CLI `supabase` funciona **sin npx** y el proyecto está enlazado al remoto
  (`gotetvnmnlrsfhsnounn`). `supabase db push` aplica migraciones sin pedir
  confirmación interactiva real (auto-confirma).
- Tras cambiar el esquema, regenerar tipos con
  `supabase gen types typescript --linked > types/database.types.ts`
  (usar Bash, no PowerShell: `>` en PS 5.1 escribe UTF-16 y PowerShell
  `-replace`+`Set-Content` corrompe los acentos UTF-8 de los .tsx).
- `npm run lint` está roto (`next lint` se eliminó en Next 16); usar
  `npx eslint <paths>`. Errores preexistentes conocidos: Drawer.tsx
  (setState en efecto), customers/page.tsx (useVirtualizer), dashboard/page.tsx
  (roleLabel sin uso).
- CLI de Supabase: el que se usa es el de **scoop** (`~/scoop/shims/supabase`), v2.117.0 desde
  2026-09-10 (`scoop update supabase`). La devDependency `supabase` 2.72.4 de package.json no se usa.
- SQL contra produccion sin MCP: `supabase db query --linked "select ..."` o `-f archivo.sql`
  (via Management API). Para probar migraciones sin persistir, ver Aprendizajes del PRP de reserva online.
- Edge functions: `supabase functions deploy <nombre> --use-api` (sin Docker; el daemon suele estar apagado).
  No hay Deno: chequear sintaxis antes con `typescript.transpileModule` desde Node.
- Antes de `supabase db push`, correr `supabase migration list --linked` (la 028 estaba aplicada a mano).
- Build de producción: `npm run build:next` (el `build` normal añade scripts
  de Capacitor).
- pg_cron se habilitó en la migración 025 (antes los recordatorios WhatsApp NO
  corrían automáticamente); jobs: `wa-reminders` y `wa-daily-summary` cada 15 min.
- El usuario (Roberto) prefiere actualizar el landing solo cuando un plan
  completo está terminado, no por fases ([[preferencias-roberto]]).
