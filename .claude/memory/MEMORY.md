# Memoria del Proyecto — Indice

> Archivos organizados por carpeta (tipo). Max 200 lineas.
> Gestionado por skill memory-manager. Auto-memory de Claude Code DESACTIVADO.
> Ultima revision: 2026-09-07.

## user/ — Sobre el usuario/equipo
- [Roberto](user/roberto.md) — operador y dueno del producto; Windows + VS Code, usar Bash para escribir archivos; prioriza coste $0 sobre infra ya pagada

## project/ — Proyectos y decisiones activas
- [Producto y dominio](project/producto-y-dominio.md) — que es Turno Flash, multi-org, roles admin/owner/staff, maquina de 9 estados de turno
- [Estado actual (sep 2026)](project/estado-actual-2026-09.md) — que esta hecho, que falta (cero tests, cero CI, sin Sentry), dominio `turno-flash.vercel.app`, fechas de licencia posiblemente corridas (bug ya arreglado) y por que los docs mienten
- [Rediseno de UI](project/rediseno-ui-migracion.md) — completo (9/9) desde 2026-09-10, incluidos details e invite; decisiones cerradas
- [Reserva online](project/reserva-online.md) — implementada 2026-09-10 (migraciones 029-031 + edge `public-booking`); horario y servicios por profesional (estricto), aprobacion por servicio, opt-in, vacaciones; `/book?b=<slug>`
- [Modulo reserva de asientos](project/modulo-reserva-asientos.md) — IDEA sin empezar: modulo aparte para vender asientos de guagua (salidas por dia con descripcion, capacidad, sena); no tocar el motor de turnos
- [WhatsApp y automatizaciones](project/whatsapp-automatizaciones.md) — OpenWA, edge functions por intent, crons cada 15 min, toggles por negocio
- [Enforcement de licencia](project/license-enforcement.md) — bloqueo de trial vencido (RLS de escritura + LicenseGate); gracia de 7d hardcodeada en SQL a sincronizar con el cliente
- [Tooling](project/turno-flash-tooling.md) — CLI de Supabase via scoop v2.117 (sin npx); `npm run lint` roto (usar `npx eslint`); regenerar tipos via Bash; pg_cron en migracion 025

## feedback/ — Correcciones y preferencias
- [Preferencias de Roberto](feedback/preferencias-roberto.md) — espanol para hablar, ingles para el codigo; landing solo al cerrar un plan completo; nada de refactors ni dependencias sorpresa

## reference/ — Donde encontrar cosas
- [Arquitectura: static export](reference/arquitectura-static-export.md) — **sin API routes ni middleware**; la seguridad real es RLS; lo de servidor va en Edge Functions
- [Convenciones de codigo](reference/convenciones-de-codigo.md) — services estaticos, hooks `.query`, schemas Zod, tokens `st-*`/`mesh-*`, primitivas en `components/ui/` (incl. `KebabMenu`, `ConfirmSheet`), `datetime-local` en hora local, sin N+1
- [Mapa de docs](reference/mapa-docs.md) — que doc sirve y cuales son de enero y estan obsoletos
- [Secretos en assets del template](reference/secretos-en-assets-del-template.md) — el PNG de video-visuals traia una API key de OpenRouter en su XMP; como detectarla y como reescribir commits sin pushear
