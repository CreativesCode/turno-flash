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
  de Capacitor). Desde 2026-10-06 ambos corren después `scripts/fix-windows-export.mjs`
  (ver [[arquitectura-static-export]]). Las páginas del panel viven en `app/(app)/dashboard/`.
- pg_cron se habilitó en la migración 025 (antes los recordatorios WhatsApp NO
  corrían automáticamente); jobs: `wa-reminders` y `wa-daily-summary` cada 15 min.
- El usuario (Roberto) prefiere actualizar el landing solo cuando un plan
  completo está terminado, no por fases ([[preferencias-roberto]]).

## Probar en navegador y medir (2026-10-06)

- **El MCP de Playwright suele estar ocupado** por otra sesión ("Browser is already in use") y el **MCP de
  Supabase puede estar sin autenticar**. Alternativas que funcionan: `playwright-core` instalado en el
  scratchpad (no en el repo) lanzando el Chromium de `~/AppData/Local/ms-playwright/chromium-*/chrome-win64/chrome.exe`;
  para datos, el CLI (`supabase inspect db table-stats --linked`) o REST con la clave de servicio de `.env.local`.
- En `next dev` el overlay de errores (`<nextjs-portal>`) tapa botones y sale en las capturas: ocultarlo con
  `page.addStyleTag({ content: "nextjs-portal{display:none!important}" })`. Los `<input type=date>` salen en
  formato español solo si Chromium arranca con `--lang=es-ES`.
- **Medir el peso real de una página:** `npm run build:next`, servir `out/` y sumar el tamaño **brotli** de cada
  respuesta (así lo sirve Vercel). `python -m http.server` no resuelve `/ruta` a `ruta.html`; para navegar el
  panel exportado hace falta un servidor mínimo que lo haga. Parar esos servidores antes de recompilar.
- `npm run dev` bloquea las carpetas de `app/`: pararlo antes de moverlas y borrar `.next/dev` después.
- No terminar un comando Bash con `cat > archivo` sin heredoc: se queda esperando entrada hasta el timeout.

## Aprendido el 2026-10-08

- **Scripts de edición grandes:** un heredoc de Bash colapsa `\\` en `\` (rompe regex y `\u{…}`) y se trunca si es
  largo. Escribir el `.py` o `.cjs` con Write en el scratchpad y ejecutarlo desde ahí.
- **Ensayar migraciones:** `supabase db query --linked -f` con `BEGIN … ROLLBACK`, juntando los resultados en una
  tabla temporal y un único `SELECT` final (solo vuelve el último resultado). Para simular un rol dentro de un `DO`:
  `set_config('request.jwt.claims', …, true)` + `SET LOCAL ROLE authenticated` + `RESET ROLE`.
- **Definición viva de una función:** `select pg_get_functiondef(oid) …` por `db query`, guardar a un archivo y
  generar la migración reemplazando solo lo necesario. La consola de Windows muestra mal los acentos; el archivo
  queda bien en UTF-8.
- **Funciones desplegadas y su `verify_jwt`:** `supabase functions list`. `config.toml` declara `wa-inbound` y
  `revenuecat-webhook` con `verify_jwt = false`.
- **Probar una edge function pública desde fuera:** `curl` con la clave anon de `.env.local` (cargarla con
  `set -a; . ./.env.local`, sin imprimirla). Con un `service_id` o `trip_id` inexistente se prueba la validación
  sin crear nada.
- **Chequear la sintaxis de una edge function sin Deno:** `typescript.transpileModule` desde Node; sirve también
  para extraer una función suelta y ejecutarla con datos de ejemplo (ojo: los archivos tienen CRLF).
- **Playwright MCP funcionó** en esta sesión (login del empleado QA, medidas con `browser_evaluate`). El MCP de
  Supabase seguía sin autenticar: se usó el CLI.
- **Rehacer una foto de la guía:** `playwright-core` instalado en el scratchpad + Chromium de `ms-playwright`,
  viewport 390x700 con `deviceScaleFactor: 2`, `--lang=es-ES`, ocultar `nextjs-portal`, contorno naranja `#f97316`
  por estilo en línea, `sharp().resize(520, 933).webp({ quality: 80 })`. Negocio `qa-fixture-*` creado con la clave
  de servicio (`create_organization_with_owner`) y borrado en el `finally`.
- **Con `npm run dev` corriendo**, `tsc` puede mostrar errores de `.next/dev/types/validator.ts` al agregar un
  layout nuevo: son tipos generados viejos; se van con `npm run build:next`.
- `.playwright-mcp/` está en `.gitignore` desde el 2026-10-08.
