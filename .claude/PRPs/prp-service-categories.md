# PRP-004: Categorías de servicios, marcas, orden y descripciones multilínea

> **Estado**: PENDIENTE DE APROBACIÓN (decisiones cerradas el 2026-10-14)
> **Fecha**: 2026-10-14
> **Proyecto**: Turno Flash
> **Origen**: Espiral Studio (Aicenis) — ~29 paquetes de fotos repartidos en Familiares / Embarazo / Boda / Quince

---

## Objetivo

Que cada negocio pueda, **solo si quiere**, agrupar sus servicios en categorías de un nivel, ordenarlos,
ponerles una marca («Recomendado», «Más popular»…), escribir descripciones de varias líneas que se vean
tal cual, y asignar una categoría entera a un profesional de un toque. En la reserva online el cliente
elige primero la categoría y solo ve los servicios de esa categoría. Un negocio sin categorías ve
exactamente lo mismo que hoy.

## Por Qué

| Problema (hoy) | Solución |
|----------|----------|
| Un cliente de embarazo tiene que recorrer los 29 paquetes, incluidas las ofertas de 15 | En `/book`, paso nuevo «¿Qué te interesa?» con las categorías; después solo los servicios de esa categoría |
| No hay forma de ordenar servicios: con `sort_order` = 0 salen por orden alfabético («Photobook 12x16» antes que «Photobook 5x7») | Subir/bajar servicios dentro de su categoría (ya existe `ServiceService.reorder`, sin pantalla) |
| La descripción se aplasta en un párrafo y en `/book` se corta a 2 líneas | Saltos de línea respetados, descripción completa al tocar «Ver detalle» |
| La lista de precios de «Fotos sueltas» (~20 líneas) no entra en 500 caracteres | Límite a 1000 |
| No se puede resaltar el paquete recomendado | Marca opcional por servicio (lista fija: Recomendado, Más popular, Nuevo, Oferta) |
| Asignar 29 servicios a cada profesional es marcarlos uno por uno | Agrupados por categoría con «marcar toda la categoría» |
| Cargar 29 paquetes casi iguales a mano | Acción «Duplicar» en cada servicio |
| El selector de «Nuevo turno» del panel es una grilla plana | Agrupado por categoría |

**Valor de negocio**: sirve a cualquier negocio con catálogo grande (fotografía, salones con cortes/color/uñas,
clínicas con consultas/estudios); menos abandono en la reserva online y configuración mucho más rápida.

## Qué

### Criterios de Éxito
- [ ] **Negocio sin categorías: cero cambios visibles** en las 5 vistas (screenshot antes/después de un negocio existente).
- [ ] Dueño/admin crea, renombra, ordena y borra categorías; borrar una categoría deja sus servicios «Sin categoría» (no borra servicios). Empleado (`staff`) las ve pero no las edita (igual que los servicios hoy).
- [ ] Nombre de categoría único por negocio (sin distinguir mayúsculas/espacios); error claro en español.
- [ ] Cada servicio tiene categoría (opcional), marca (opcional) y orden; el orden lo decide el dueño con subir/bajar y se respeta en las 5 vistas.
- [ ] La marca **no reordena**: aparece como etiqueta en el lugar que el dueño eligió (en las fotos de Aicenis el recomendado suele ser el último).
- [ ] Descripción de hasta 1000 caracteres; los saltos de línea se ven en Servicios, `/book` y el detalle del turno; nunca HTML.
- [ ] `/book` con 2+ categorías: paso «¿Qué te interesa?» → servicios solo de esa categoría → resto igual. Con 0 o 1 categoría con servicios visibles: el paso no aparece. «Atrás» vuelve al paso de categorías. Los servicios sin categoría salen como «Otros» (solo si hay al menos una categoría).
- [ ] Una categoría sin servicios visibles en línea (pausados u ocultos de la reserva) no aparece en `/book`.
- [ ] «Nuevo turno» y «Editar turno» del panel: servicios agrupados por categoría con su encabezado; editar un turno cuyo servicio está pausado sigue funcionando como hoy.
- [ ] «Servicios y horario» del profesional: servicios agrupados; tocar la categoría marca todos sus servicios activos, y la desmarca si ya estaban todos; el guardado sigue siendo atómico (`save_staff_schedule`).
- [ ] Ningún usuario puede asignar a un servicio una categoría de otro negocio (ensayo por rol con INSERT/UPDATE reales).
- [ ] Cambios de categorías y servicios se ven en otro dispositivo sin recargar (realtime, como hoy con servicios).
- [ ] Panel con licencia vencida: crear/editar categorías bloqueado igual que los servicios (RLS 027 + LicenseGate).
- [ ] `npx tsc --noEmit`, `npx eslint .` y `npm run build:next` pasan; manual de `/help` actualizado.

### Comportamiento Esperado (caso Espiral Studio)

1. Aicenis entra a **Servicios** → «Categorías» → crea Familiares, Embarazo, Boda, Quince, Fotos sueltas (y una
   descripción opcional en Boda: «Incluye estilismo y vestuario»). Las ordena.
2. Crea «Álbum personalizado 6x8» en Boda con la lista del paquete en varias líneas. Lo **duplica** dos veces
   y cambia tamaño, contenido y precio. Marca el de 8x12 como «Más popular».
3. Con subir/bajar deja Boda en el orden de su folleto. La lista de Servicios muestra un encabezado por categoría.
4. En **Equipo → Emilio → Servicios y horario** toca «Boda» y «Quince»: quedan marcados sus 13 servicios. Guarda.
5. Una novia abre `/book?b=espiral-studio-9c7a97`: ve «¿Qué te interesa?» con 5 opciones (con la descripción de
   la categoría si tiene). Toca «Boda» → ve solo los 7 paquetes de boda, en orden, con la etiqueta «Más popular» y
   el contenido línea por línea (botón «Ver detalle» si es largo). Elige uno → Emilio aparece → reserva como hoy.
6. Desde el panel, Emilio crea un turno: el selector muestra los servicios bajo Familiares / Embarazo / Boda…

---

## Contexto

### Lo que YA existe (brownfield — no recrear)
- Tabla `service_categories` (010: `organization_id`, `name`, `description`, `icon`, `color`, `sort_order`,
  `is_active`) con RLS: lectura miembros de la org, escritura admin/owner **con guard de licencia** (027). Sin UI.
- `services.category_id` → FK `services_category_id_fkey` a `service_categories` `ON DELETE SET NULL` (010).
- `services.sort_order` existe; `ServiceService.getAll` ordena por `sort_order`; `ServiceService.reorder`
  (`services/services.service.ts:447`) existe **sin pantalla**; el formulario siempre manda `sort_order: 0`.
- `serviceCategoryFormSchema`, `serviceFormSchema.category_id` (`schemas/service.schema.ts`), tipo
  `ServiceCategory` (`types/appointments.ts`), filtro `categoryId` en `getAll` / `useServicesQuery`.
- `services.description` es `TEXT` sin límite en BD; el límite de 500 está solo en Zod.
- Realtime: `useRealtimeServices` invalida `serviceKeys.all` (`hooks/useRealtimeEntities.ts`); `service_categories`
  **no** está en la publicación de realtime (020).
- `staff_services` + RPC atómica `save_staff_schedule(p_staff_id, p_ranges, p_service_ids)` (031).
- `/book`: `BookingFlow.tsx` con `useStepHistory<Step>("service")`, `PREVIOUS_STEP`, `STEP_TITLES`;
  `public_booking_info` (definición viva en 068) ordena servicios por `sort_order, name`; la edge
  `public-booking` es passthrough del JSON.
- Página de Servicios: solo admin/owner editan (`profile.role`), búsqueda con `useDebounce`.

### Las 5 vistas afectadas (y las que NO)
| Vista | Archivo | Cambio |
|---|---|---|
| Servicios (panel) | `app/(app)/dashboard/services/page.tsx`, `ServiceCard`, `ServiceFormModal` | categorías, agrupado, orden, marca, duplicar, multilínea |
| Gestionar categorías | `components/services/CategoriesSheet.tsx` (nuevo) | crear/renombrar/describir/ordenar/borrar |
| Servicios y horario | `components/staff/StaffScheduleSheet.tsx` | agrupado + marcar categoría |
| Nuevo/Editar turno | `components/appointments/AppointmentModal.tsx` | selector agrupado |
| Reserva online | `components/booking/BookingFlow.tsx`, `BookingSteps.tsx`, `types/public-booking.ts` | paso de categoría, agrupado, marca, multilínea, «Ver detalle» |

**Revisadas y sin cambios** (solo muestran el nombre del servicio): calendario, lista de turnos, detalle de turno
(solo se verifica que la descripción no se muestre aplastada si aparece), clientes, reportes/analytics, mensajes y
campañas de WhatsApp, recordatorios, resumen diario, «Mis turnos», configuración de reservas (el aviso «sin
servicios asignados» se re-verifica en la Fase 4), módulo de pasajes.

### Arquitectura Propuesta
```
supabase/migrations/085_service_categories.sql          # nueva
services/service-categories.service.ts                  # nuevo (CRUD + reorder)
hooks/useServiceCategories.query.ts                     # nuevo (+ realtime en useRealtimeEntities)
schemas/service.schema.ts                               # badge, descripción 1000, categoría
types/appointments.ts, types/public-booking.ts          # badge, categoría, categories[] público
utils/group-services.ts                                 # ÚNICO helper de agrupado/orden para las 5 vistas
config/service-badges.ts                                # lista fija de marcas + etiqueta + estilo
components/services/CategoriesSheet.tsx                 # nuevo
components/services/ServiceBadge.tsx                    # nuevo (etiqueta compartida panel + /book)
```

### Modelo de Datos
```sql
-- 085_service_categories.sql (borrador; se afina en la Fase 1)

-- 1. Optional badge, fixed list (labels live in config/service-badges.ts)
ALTER TABLE public.services
  ADD COLUMN badge TEXT
  CHECK (badge IN ('recommended', 'popular', 'new', 'offer'));

-- 2. Unique category name per business
CREATE UNIQUE INDEX service_categories_org_name_key
  ON public.service_categories (organization_id, lower(btrim(name)));

-- 3. Service can only point to a category of its own business (RLS only checks the
--    service's org today). Composite FK; SET NULL only on category_id (PG15+).
ALTER TABLE public.service_categories
  ADD CONSTRAINT service_categories_id_org_key UNIQUE (id, organization_id);
ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_category_id_fkey,
  ADD CONSTRAINT services_category_org_fkey
    FOREIGN KEY (category_id, organization_id)
    REFERENCES public.service_categories (id, organization_id)
    ON DELETE SET NULL (category_id);

-- 4. Realtime for categories (same as services in 020)
ALTER TABLE public.service_categories REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_categories;

-- 5. public_booking_info: live body from 068, plus per service 'category_id' and
--    'badge', plus top-level 'categories' [{id, name, description, sort_order}]
--    with only active categories that have at least one listed service.
--    Service order stays sort_order, name.
```
RLS: `service_categories` ya tiene RLS y políticas (010/027); no hace falta nada nuevo.

### Decisiones cerradas (con Roberto, 2026-10-14)
- Categorías de **un solo nivel**; el tipo de producto (Álbum / Photobook / Revista) va en el nombre del servicio.
- **Marcas incluidas** (Roberto): lista fija Recomendado / Más popular / Nuevo / Oferta, una por servicio, sin reordenar.
- Categoría = nombre + descripción opcional + orden (color e icono de la tabla quedan sin usar).
- Descripción hasta 1000 caracteres (la lista de «Fotos sueltas» no entra en 500).
- Pedidos de fotos sueltas por tamaño con mínimo de 5 y reportes por categoría: **fuera de este PRP**.

- **Asignar por categoría = atajo (A)**: marca todos los servicios de la categoría; un servicio nuevo se marca después.
- **«Duplicar» incluido**: copia con «(copia)» en el nombre, misma categoría, al final del grupo.
- **Enlace por categoría incluido**: `/book?b=<slug>&c=<id de categoría>` + «Copiar enlace» en cada categoría.
- **Landing**: una línea sobre categorías al cerrar el plan (Fase 7).

---

## Blueprint (Assembly Line)

> Solo FASES. Las subtareas se generan al entrar a cada fase (mapear contexto → subtareas → ejecutar).

### Fase 1: Base de datos
**Objetivo**: migración 085 (marca, nombre único, integridad categoría↔negocio, realtime, `public_booking_info`
con categorías y marca, y `c` resuelto por id); tipos regenerados.
**Validación**: ensayo por rol (owner, staff, anon) con INSERT/UPDATE reales: categoría de otra org rechazada,
nombre duplicado rechazado, staff no puede crear categoría, borrar categoría deja `category_id` NULL y no falla,
licencia vencida bloquea; `supabase db push`; `public_booking_info` de Espiral trae `categories`, `category_id` y
`badge`; negocio sin categorías trae `categories: []`; `npx tsc --noEmit` pasa.

### Fase 2: Capa de datos
**Objetivo**: `ServiceCategoryService` + `useServiceCategoriesQuery` (+ realtime), `ServiceService` guarda
`category_id` / `badge` / `sort_order` (alta al final de su categoría), `reorder` cableado, `duplicate`, Zod actualizado, `utils/group-services.ts` y `config/service-badges.ts`.
**Validación**: tsc + eslint; el helper cubre sin categorías (lista plana idéntica a hoy), «Otros» al final solo si
hay categorías, categoría vacía oculta, orden por `sort_order` y luego nombre, categorías inactivas tratadas como
sin categoría.

### Fase 3: Pantalla Servicios
**Objetivo**: `CategoriesSheet` (crear, renombrar, descripción, subir/bajar, borrar con `ConfirmSheet` que dice
cuántos servicios quedan sin categoría); formulario con categoría (`Select`), marca, descripción más alta con
contador; lista agrupada con subir/bajar dentro del grupo, marca y descripción multilínea; búsqueda sigue
buscando en todo; «Duplicar»; empleado ve sin botones de edición.
**Validación**: Playwright: flujo completo del caso Espiral en un negocio desechable; borrar categoría; negocio sin
categorías idéntico al de antes; móvil 390px y escritorio, claro y oscuro.

### Fase 4: Asignación a profesionales
**Objetivo**: «Servicios y horario» agrupado con «marcar toda la categoría» (atajo, opción A).
**Validación**: asignar categoría, guardar, reabrir y ver persistido; `/book` ofrece al profesional para esos
servicios; aviso «sin servicios asignados» de la configuración de reservas correcto.

### Fase 5: Nuevo/Editar turno
**Objetivo**: selector de `AppointmentModal` agrupado con marcas; edición de turno con servicio pausado intacta.
**Validación**: crear y editar turno con y sin categorías; móvil y escritorio.

### Fase 6: Reserva online
**Objetivo**: paso «¿Qué te interesa?» (`category`) en `BookingFlow` con `STEP_TITLES`, `PREVIOUS_STEP` e historial;
salto automático con 0-1 categorías; `ServiceStep` filtrado por categoría, con marca, saltos de línea y «Ver
detalle»; «Reservar otro» vuelve al primer paso; `&c=` abre directo la categoría (`c` inválido → paso de
categorías); «Copiar enlace» por categoría en `CategoriesSheet`.
**Validación**: Playwright 390px y escritorio: reserva de punta a punta con categorías, sin categorías, con una sola
categoría, con `&c=` válido e inválido; botón Atrás del navegador y del flujo; descripción de 20 líneas legible.

### Fase 7: Manual, landing y memoria
**Objetivo**: manual de `/help` (`docs/user-manual/`) con categorías, orden, marcas, duplicar y asignación por
categoría; línea en la landing; memoria del proyecto actualizada.
**Validación**: `/help` muestra la sección nueva; memoria refleja la 085 y las decisiones.

### Fase 8: Validación final
- [ ] `npx tsc --noEmit`, `npx eslint .`, `npm run build:next`
- [ ] Playwright en las 5 vistas, claro y oscuro, móvil y escritorio
- [ ] Un negocio real sin categorías se ve igual que antes
- [ ] Todos los criterios de éxito marcados

---

## Aprendizajes (Self-Annealing)

_(vacío — se completa durante la implementación)_

---

## Gotchas

- [ ] `service_categories`, el FK y los schemas Zod **ya existen**: extender, no recrear.
- [ ] `public_booking_info` se redefine desde la definición viva (`pg_get_functiondef`), no desde 068 a ciegas; la
      edge `public-booking` es passthrough → sin redeploy (si hiciera falta, **preguntar antes de desplegar**).
- [ ] Índice único con función: ensayar con INSERT/UPDATE reales por rol (memoria: migraciones-a-produccion).
- [ ] `ON DELETE SET NULL (category_id)` con lista de columnas, si no Postgres pone NULL en `organization_id`.
- [ ] RLS rechaza en silencio: tras crear/borrar/reordenar, confirmar filas afectadas.
- [ ] Reordenar = varias filas: usar el `reorder` existente y revisar que no deje huecos ni empates raros.
- [ ] Descripción en texto plano con `whitespace-pre-line`; nunca `dangerouslySetInnerHTML`.
- [ ] Con 0 categorías el helper debe devolver la lista exactamente en el orden de hoy (no cambiar la vista).
- [ ] `useStepHistory`: el paso inicial depende de los datos (categorías) que llegan después; no saltar pasos antes de
      que cargue la info.
- [ ] Copy en español internacional (tuteo); moneda con `useMoney` en el panel; `Select` y `ConfirmSheet` del sistema.
- [ ] Tipos con Bash (`supabase gen types typescript --linked > types/database.types.ts`), no PowerShell.
- [ ] Es web (static export): no requiere APK nueva.

## Anti-Patrones

- NO duplicar la lógica de agrupado/orden en cada vista (un solo helper).
- NO usar colores/iconos de categoría que nadie pidió.
- NO dejar que la marca cambie el orden.
- NO añadir dependencias (subir/bajar con botones, sin librería de arrastrar).

---

*PRP pendiente de aprobación. No se ha modificado código.*
