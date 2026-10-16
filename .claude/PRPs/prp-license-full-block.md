# PRP-005: Bloqueo total por licencia vencida

> **Estado**: COMPLETADO (2026-10-16)
> **Fecha**: 2026-10-15
> **Proyecto**: Turno Flash

---

## Objetivo

Cuando un negocio pasa el margen de 5 días tras vencer su licencia (o sigue «En preparación»), queda
**bloqueado del todo** (decisión D-10): no puede ver ni cambiar ninguno de sus datos y no sale ni entra
ningún mensaje de WhatsApp de sus turnos o pasajes. Solo puede entrar a «Suscripción» y «Mi cuenta» para
pagar o cerrar la cuenta.

## Por Qué

| Problema | Solución |
|----------|----------|
| Hoy el bloqueo de lectura es solo visual: con el token del usuario se siguen leyendo turnos, clientes, etc. | Las políticas RLS de lectura exigen licencia usable |
| Ajustes del negocio e historial de clientes se pueden modificar aunque esté bloqueado | Se añade el mismo guard a sus políticas de escritura |
| Un negocio que no paga sigue gastando la línea de WhatsApp (recordatorios, respuestas «OK», pasajes) | `wa-send`, `wa-trip-send` y `wa-inbound` no hacen nada para un negocio bloqueado |

**Valor de negocio**: el bloqueo es real y no esquivable, que es lo que da sentido a cobrar; y la línea
compartida de OpenWA solo trabaja para negocios al día.

## Qué

### Decisiones tomadas (2026-10-15)
- **WhatsApp: se corta todo** para el negocio bloqueado — recordatorios, confirmaciones, avisos al negocio,
  pasajes y respuestas de sus clientes. Los avisos de licencia (`license-notices`) **sí** siguen: son los que
  le dicen al dueño cómo pagar.
- **Sin descarga de datos** durante el bloqueo. Si el dueño los necesita, escribe a soporte.
- Sin cambios: el margen de 5 días, la pantalla de bloqueo, las rutas permitidas, y que el admin de la
  plataforma nunca se bloquea.

### Criterios de Éxito
- [x] Un owner y un staff de un negocio bloqueado leen **0 filas** de cada tabla operativa (turnos, clientes,
      historial, servicios, categorías, profesionales y sus horarios/servicios/ausencias, solicitudes, lista de
      espera, ajustes, recordatorios, mensajes enviados, errores, salidas, puntos de recogida, pasajes, fotos).
- [x] Ese mismo usuario no puede insertar ni modificar ajustes del negocio ni historial de clientes.
- [x] Un negocio con licencia usable sigue leyendo y escribiendo exactamente lo mismo que hoy.
- [x] El admin de la plataforma no pierde nada de lo que ve hoy.
- [x] «Suscripción» y «Mi cuenta» siguen funcionando con el negocio bloqueado (registrar pago, ver plan,
      editar perfil, borrar cuenta).
- [x] `wa-send`, `wa-trip-send` y `wa-inbound` devuelven `license_blocked` sin enviar nada para un negocio
      bloqueado, y quedan registrados en el resultado como hoy hace `daily-summary`.
- [x] Al volver a quedar al día (admin registra el pago), todo reaparece sin reinstalar ni cerrar sesión.
- [x] Las listas grandes no se vuelven más lentas (el chequeo de licencia se evalúa una vez por consulta,
      no una vez por fila).

### Comportamiento Esperado
1. Licencia vence → 5 días de margen con todo funcionando (sin cambios).
2. Día 6: el owner abre la app → pantalla de bloqueo (ya existe). Si pide datos por API, recibe listas vacías.
3. Un cliente del negocio responde «OK» por WhatsApp → no se procesa ni se contesta.
4. Llega la hora de un recordatorio → no se envía.
5. El admin registra el pago → el owner recarga y vuelve a ver todo.

---

## Contexto

### Referencias
- `supabase/migrations/027_enforce_license_on_writes.sql` — patrón actual (guard en políticas de escritura).
- `supabase/migrations/073_license_plans_and_phases.sql` — `org_license_usable` / `check_license_status` vigentes.
- `supabase/migrations/048_*` — helpers `auth_user_org_id()`, `auth_user_role()`, `is_platform_admin()`.
- `supabase/functions/daily-summary/index.ts:118` — cómo una edge function salta un negocio bloqueado.
- `components/license-gate.tsx` — compuerta del cliente (no cambia).
- Memoria: `project/license-enforcement.md`, `feedback/migraciones-a-produccion.md`.

### Estado actual (reconstruido de las migraciones; confirmar contra producción en la Fase 1)
Políticas de lectura **sin** guard de licencia: `appointments`, `appointment_requests`, `customers`,
`customer_history`, `services`, `service_categories`, `staff_members`, `staff_availability`,
`staff_services`, `staff_exceptions`, `waitlist`, `business_settings`, `reminder_logs`,
`wa_outbound_messages`, `error_logs`, `trips`, `trip_pickup_points`, `trip_bookings`, y fotos de salidas
en Storage (`trip-photos`).
Escritura **sin** guard: `business_settings` (owner) y `customer_history`.
Quedan abiertas a propósito: `organizations`, `user_profiles`, `notifications`, `license_*`,
`subscription_events`, `app_config` (las necesitan la compuerta, Suscripción y Mi cuenta).

### Diseño técnico
- Helper nuevo sin parámetros, p. ej. `public.auth_org_usable()`: `true` si quien llama es admin de la
  plataforma o si `org_license_usable(auth_user_org_id())`. Se usa como `(SELECT public.auth_org_usable())`
  para que Postgres lo calcule **una vez por consulta** (initplan) y no por fila.
- Cada política de lectura listada se recrea igual que hoy + `AND (SELECT public.auth_org_usable())`.
  Las políticas `FOR ALL` ya guardadas también dan lectura, pero ya exigen licencia: no cambian.
- Edge functions: tras cargar el turno / pasaje / negocio, `rpc("org_license_usable")` y salir con
  `license_blocked` si no es `true` (mismo patrón que `daily-summary`).

---

## Blueprint

### Fase 1: Base de datos — cerrar lecturas y los dos huecos de escritura
**Objetivo**: migración `086` con el helper y las políticas recreadas; confirmar antes en producción la
lista real de políticas (`pg_policies`).
**Validación**: ensayo por rol en transacción revertida: owner y staff de un negocio bloqueado → 0 filas y
escrituras rechazadas; owner de un negocio al día → mismos conteos que antes; admin → igual que antes.
`EXPLAIN` de la lista de clientes muestra el chequeo como initplan.

### Fase 2: WhatsApp — no enviar ni procesar para negocios bloqueados
**Objetivo**: `wa-send`, `wa-trip-send` y `wa-inbound` salen con `license_blocked`.
**Validación**: chequeo de sintaxis (transpile) y prueba desde fuera contra un negocio desechable bloqueado;
**el despliegue se pregunta antes**.

### Fase 3: App — volver a mostrar todo al quedar al día
**Objetivo**: confirmar que la compuerta, «Suscripción» y «Mi cuenta» funcionan con las lecturas cerradas y
que, al desbloquearse, las listas se recargan (invalidar consultas si hiciera falta).
**Validación**: Playwright con un negocio desechable: bloqueado → pantalla de bloqueo y Suscripción OK;
extender licencia → vuelve todo.

### Fase 4: Validación final y documentación
**Validación**:
- [x] `npx tsc --noEmit` y `npx eslint` de lo tocado pasan
- [x] `npm run build:next` exitoso
- [x] Criterios de éxito cumplidos
- [x] Memoria (`license-enforcement.md`) y manual de usuario al día si cambia algo visible

### Cómo quedó
- Migración **087** (`087_license_blocks_reads.sql`): en lugar de recrear ~20 políticas, una política
  **RESTRICTIVE** «License must be usable» por tabla (se combina con AND con las existentes) + `auth_org_usable()`.
  En `error_logs` solo SELECT/UPDATE (la app sigue pudiendo reportar sus errores). En `storage.objects` solo el
  bucket `trip-photos`.
- `wa-send` v35, `wa-trip-send` v11 y `wa-inbound` v48 desplegadas: salen con `license_blocked`.
- `LicenseGate` invalida todas las consultas al pasar de bloqueado a usable.
- Manual: los apartados de bloqueo avisan que no salen mensajes de WhatsApp a los clientes.

---

## Aprendizajes

### 2026-10-16: una política RESTRICTIVE por tabla en vez de reescribir todas
- **Por qué**: añadir el guard a cada política de lectura obligaba a recrear ~20 políticas copiando su
  condición (riesgo de cambiar sin querer quién ve qué). Una RESTRICTIVE independiente de la fila se suma con
  AND y deja intacto todo lo demás; el ensayo dio los mismos conteos antes y después para dueño, empleado, otro
  negocio y admin.
- **Rendimiento**: `(SELECT public.auth_org_usable())` aparece como `InitPlan` en el `EXPLAIN`: una vez por consulta.
- **Aplicar en**: cualquier condición global (por negocio o por usuario) que deba valer para muchas tablas.

### 2026-10-16: un negocio sin fechas de licencia es usable para siempre
- `check_license_status` devuelve `no_license` + `is_usable = true` si `license_start_date` o `license_end_date`
  son NULL (es el caso de «Organización test»). Para ensayar un bloqueo hay que poner **las dos** fechas.
- Cambiar fechas de licencia exige actuar como admin de la plataforma (`request.jwt.claims` con su `sub`): el
  trigger `enforce_module_change_is_admin` rechaza al rol `postgres` sin JWT.

### 2026-10-16: el dueño de «Organización test» es la cuenta personal de Roberto
- No entrar con ella. Para probar en pantalla, negocio desechable `qa-fixture-*` con la clave de servicio
  (`auth.admin.createUser` + `invited_to_organization_id` en la metadata crea el perfil; luego `role = owner`) y
  borrarlo al final.
