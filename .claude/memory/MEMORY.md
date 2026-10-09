# Memoria del Proyecto — Indice

> Archivos organizados por carpeta (tipo). Max 200 lineas.
> Gestionado por skill memory-manager. Auto-memory de Claude Code DESACTIVADO.
> Ultima revision: 2026-10-08.

## user/ — Sobre el usuario/equipo
- [Roberto](user/roberto.md) — operador y dueno del producto; Windows + VS Code, usar Bash para escribir archivos; prioriza coste $0 sobre infra ya pagada

## project/ — Proyectos y decisiones activas
- [Producto y dominio](project/producto-y-dominio.md) — que es Turno Flash, multi-org, roles admin/owner/staff, maquina de 9 estados de turno; **todos los negocios están en Cuba**
- [Estado actual](project/estado-actual-2026-09.md) — foto de sep 2026 + actualización 2026-10-08: qué está hecho, agujeros (cero tests, cero CI, sin Sentry), dominio `turno-flash.vercel.app`, **commits del 5-6 oct sin subir** y APK vieja en Play; por qué los docs mienten
- [Rediseno de UI](project/rediseno-ui-migracion.md) — completo (9/9) desde 2026-09-10, incluidos details e invite; decisiones cerradas
- [Reserva online](project/reserva-online.md) — implementada 2026-09-10 (migraciones 029-031 + edge `public-booking`); horario y servicios por profesional (estricto), aprobacion por servicio, opt-in, vacaciones; `/book?b=<slug>`
- [QA piloto Cuba](project/qa-piloto-cuba.md) — plan P0-P3 en `.claude/PRPs/qa-piloto-cuba.md`; **P0, P1 y P2 cerrados** (salvo P1-26, Mac); **P3 cerrado** el 2026-10-08 salvo `special` (migraciones 067-072 aplicadas, funciones desplegadas, commiteado en 7 commits locales **sin subir a GitHub**; las compras de prueba de RevenueCat ya no extienden la licencia); falta APK nueva + pruebas en teléfono real, SMTP propio y el WhatsApp de cada dueño; offline del panel, guía de primeros pasos; RLS rechaza en silencio; roles decididos; cómo probar con un negocio desechable
- [Modulo reserva de asientos](project/modulo-reserva-asientos.md) — 9/10 fases (migraciones 033-047, edges public-trips y wa-trip-send, dashboard, pagina publica /trips, WhatsApp incl. cancelaciones); solo falta el cron de vencimiento (frenado otra vez 2026-09-12); anticipo y confirmacion son ejes independientes
- [WhatsApp y automatizaciones](project/whatsapp-automatizaciones.md) — OpenWA, edge functions por intent, crons cada 15 min, toggles por negocio; los HTTP 500 de OpenWA NO impiden la entrega; clave de servicio sb_secret en Edge; formato y contacto de los mensajes (`wa-message.ts`)
- [Enforcement de licencia](project/license-enforcement.md) — bloqueo de trial vencido (RLS de escritura + LicenseGate); gracia de 7d hardcodeada en SQL a sincronizar con el cliente
- [Tooling](project/turno-flash-tooling.md) — CLI de Supabase via scoop (sin npx); `npm run lint` roto (usar `npx eslint`); tipos via Bash; pg_cron en 025; cómo probar en navegador cuando los MCP de Playwright/Supabase no están, y cómo medir el peso de una página

## feedback/ — Correcciones y preferencias
- [Preferencias de Roberto](feedback/preferencias-roberto.md) — espanol para hablar, ingles para el codigo; landing solo al cerrar un plan completo; nada de refactors ni dependencias sorpresa; **guías para gente poco ducha en tecnología y con fotos reales**
- [Migraciones a produccion](feedback/migraciones-a-produccion.md) — autorizado aplicar migraciones sin pedir permiso; siempre ensayar en BEGIN/ROLLBACK por rol antes
- [Copy en espanol internacional](feedback/copy-espanol-internacional.md) — tuteo, nunca voseo; "anticipo" y no "sena"; locale `es` y la moneda siempre explicita (`useMoney`)

## reference/ — Donde encontrar cosas
- [Arquitectura: static export](reference/arquitectura-static-export.md) — **sin API routes ni middleware**; la seguridad real es RLS; lo de servidor va en Edge Functions; rutas con sesión dentro de `app/(app)/`; script post-build para Windows
- [Convenciones de codigo](reference/convenciones-de-codigo.md) — services estaticos, hooks `.query`, schemas Zod, tokens `st-*`/`mesh-*`, primitivas en `components/ui/`, `datetime-local` en hora local, sin N+1; helpers del QA (useStepHistory, useBackToClose, utils/phone…) y del cierre de P2 (useSessionState, useCreateParam, `PERSISTED_ROOTS`, reglas de páginas públicas)
- [Mapa de docs](reference/mapa-docs.md) — que doc sirve y cuales son de enero y estan obsoletos
- [Manual de usuario](reference/manual-de-usuario.md) — fuente única en `docs/user-manual/`, servida en `/help` (se lee en build); actualizarla cuando cambie algo visible; el Artifact publicado ya no existe; guía de primeros pasos en Inicio
- [Secretos en assets del template](reference/secretos-en-assets-del-template.md) — el PNG de video-visuals traia una API key de OpenRouter en su XMP; como detectarla y como reescribir commits sin pushear
