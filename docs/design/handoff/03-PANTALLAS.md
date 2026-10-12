# 03 · Pantallas

Medidas tomadas de `TF Screen.dc.html` (móvil 390px) y `TurnoFlash Landing.dc.html`. Todo el contenido de la app va en `px-5` (20px).

---

## Shell móvil · `app/(app)/dashboard/layout.tsx`

### MobileTopbar · `components/MobileTopbar.tsx`
- Contenedor: `sticky top-0 z-30 h-[52px] bg-background/90 backdrop-blur border-b border-transparent` (el borde aparece al hacer scroll con `border-border`), con `pl-5 pr-4` y safe area arriba.
- Contenido de izquierda a derecha:
  1. **Logo** de 26px.
  2. **Nombre del negocio** (`modules.name`) en `text-body font-semibold tracking-[-0.01em]`, con un `ChevronDown` de 16px en `text-foreground-subtle`. Si es admin con varias organizaciones, abre el selector; si no, no hace nada.
  3. Espacio `flex-1`.
  4. **Campana**: botón de 44×44 con `Bell` de 21px en `text-foreground-muted`. Lleva un punto fucsia de 8px (`absolute top-2.5 right-[11px]`, `ring-2 ring-background`) cuando hay recordatorios pendientes de mañana o reservas por aprobar. Lleva a `/dashboard/reminders`.
  5. **Avatar** de 34px del usuario (`bg-secondary-100 text-secondary-600`). Lleva a `/dashboard/account`.
- **Quita la hamburguesa.** El botón de **refrescar** pasa al `MoreSheet`; además conviene añadir pull-to-refresh si ya existe un hook (si no, no lo agregues).
- Ya no se muestra el texto "TurnoFlash": la marca es el logo.

### MobileTabBar · `components/MobileTabBar.tsx`
- Contenedor: `grid grid-cols-5 items-center bg-surface border-t border-border px-2.5 pt-2`, con `padding-bottom: calc(0.5rem + safe-area)`.
- Tab: `h-12 flex flex-col items-center justify-center gap-1`, ícono de 22px y label de 11px. Activa: `text-foreground font-semibold`. Inactiva: `text-foreground-subtle font-medium`. **El color no marca la tab activa**: solo el contraste.
- Centro: botón `w-14 h-11 rounded-[14px] bg-primary text-primary-foreground` con `Plus` de 24px. Sin translate, sin sombra y sin mesh.
- Slots:
  - por defecto: `Inicio (House) · Turnos (Calendar) · + · Clientes (Users) · Más (LayoutGrid)`;
  - solo viajes: `Inicio · Viajes (Bus) · + · Clientes · Más`;
  - con los dos módulos: `Inicio · Turnos · + · Viajes · Más`, y Clientes pasa al `MoreSheet`.

  Mantén la lógica actual de `createHref`.
- "Más" abre el `MoreSheet`. Está activa cuando la ruta no corresponde a ninguna otra tab.

### MoreSheet (reemplaza a `Drawer.tsx`)
Es un `Sheet` sin título visible (`aria-label="Más"`). Contenido:
1. **Cabecera de usuario**: Avatar de 40 + nombre (`text-body font-semibold`) + rol (`text-meta text-foreground-subtle`), dentro de un `ListGroup`.
2. **Grupo "Negocio"** (`SectionLabel`): un `ListGroup` con Servicios, Profesionales, Recordatorios, Reportes, Clientes (si no está en la barra), Ajustes, Suscripción e Invitar. Cada `ListRow` lleva `leading` = `IconTile` de 36px y `trailing` = `ChevronRight`. Mantén los filtros de `roles`, `requiresOrg` y `module` de `NAV_ITEMS`.
3. **Grupo "Plataforma"** (solo admin): Plataforma, Organizaciones, Usuarios y Errores.
4. **Grupo "Cuenta"**: Mi cuenta, Ayuda, Tema (`trailing` = `SegmentedControl` Claro/Oscuro) y Actualizar datos.
5. Al final, un `Button variant="danger" size="lg" className="w-full"` con "Cerrar sesión".

Mueve `NAV_ITEMS` a `components/nav-items.ts`, compartido por `Sidebar` y `MoreSheet`.

### Sidebar escritorio · `components/Sidebar.tsx`
- Contenedor: `w-64 bg-surface border-r border-border`.
- Arriba: logo con wordmark (28px) y debajo el nombre del negocio en `text-meta text-foreground-subtle`.
- Los grupos son los mismos que en el `MoreSheet`, con `SectionLabel` (`px-3 pt-5 pb-1.5`).
- Ítem: `h-10 px-3 rounded-control flex items-center gap-3 text-body font-medium text-foreground-muted hover:bg-muted hover:text-foreground`, ícono de 18px.
- Activo: `bg-surface-2 text-foreground font-semibold`, con el ícono en `text-primary`. **Sin barra lateral de color.**
- Abajo: avatar + nombre + rol, con un `KebabMenu` que reúne Tema, Mi cuenta y Cerrar sesión.
- En escritorio, el botón "Nuevo turno" va en el `PageHeader` de cada página (`Button primary md`).

### FAB
**Elimínalos todos.** Crear turno o viaje va en el "+" de la tab bar. Crear cliente, servicio, profesional u organización va en `PageHeader actions`, con `Button variant="secondary" size="md"` y `Plus` 18 + "Nuevo", visible también en móvil.

---

## Inicio · `app/(app)/dashboard/page.tsx`

Orden vertical:
1. **Saludo** (`px-5 pt-5`):
   - fecha en `text-meta font-medium text-foreground-subtle`, con el formato "Viernes 12 de junio" (`toLocaleDateString("es", {weekday:"long", day:"numeric", month:"long"})`, con la primera letra en mayúscula);
   - debajo, en `font-display text-[40px] leading-[1.05] mt-1`: **"Buen día, {nombre}"** (antes de las 12), "Buenas tardes" (12–20) o "Buenas noches". **Sin emoji.**
   - En escritorio, el botón "Nuevo turno" (`primary md`) va a la derecha.
2. Banners de licencia y `SetupGuide` sin cambios de lógica, con estilo `Alert`.
3. **Resumen del día** (`Card p-5 mt-[22px]`):
   - Fila: `font-display text-[60px] leading-[0.9]` con `stats.total` + "turnos hoy" (`text-body font-medium text-foreground-muted`) + `flex-1` + "{completed} terminados" (`text-meta text-foreground-subtle`).
   - **Barra segmentada** `flex gap-[3px] h-2 mt-[18px]`: un segmento por grupo con `flex-grow = count` y `rounded-[4px]`, en el color `--st-c` de su estado. Orden: Terminados (completed), En curso (in_progress), Llegaron (checked_in), Confirmados (confirmed + reminded + client_confirmed), Pendientes (pending). Oculta los grupos con 0.
   - **Leyenda** `grid grid-cols-2 gap-x-5 gap-y-2.5 mt-[18px]`: punto de 8px + label (`text-meta text-foreground-muted flex-1`) + número (`font-mono font-medium text-foreground`).
4. **Ahora** (solo si hay un turno `in_progress`, o `checked_in` si no hay ninguno en curso):
   - `SectionLabel` "Ahora".
   - Tarjeta `rounded-card bg-primary-100 dark:bg-primary-900 p-4 pl-[18px] flex items-center gap-3.5`, que contiene:
     - time block con la hora en `font-mono text-[16px] font-semibold text-primary-700 dark:text-primary-400` y "hasta HH:MM" en `text-caption text-primary-700/80`;
     - nombre en `text-[16px] font-semibold` y "servicio · staff" en `text-meta text-foreground-muted`;
     - `Button primary size="sm"` con la acción de `NEXT_ACTIONS`.
5. **Próximos**: `SectionLabel` "Próximos" con la acción "Ver agenda". Un `ListGroup` con los 3 próximos (time block + nombre + "servicio · staff" con el punto del servicio + `StatusTag`).
6. **Avisos de mañana** (si hay turnos de mañana sin recordatorio): `Card p-4 mt-4 flex items-center gap-3.5` con `IconTile tone="pink"` (`MessageCircle`) + "{n} avisos para mañana" (`text-body font-semibold`) + "Clientes sin recordatorio enviado" (`text-meta text-foreground-muted`) + `ChevronRight`. Lleva a `/dashboard/reminders`. Si no hay datos para calcularlo, muéstralo con el conteo de turnos de mañana o no lo muestres.
7. **Se elimina la grilla de atajos (`SHORTCUTS`).** Su contenido ya está en el `MoreSheet` y en el sidebar.
8. **Admin sin organización**: el "Resumen del sistema" se mantiene con `Card` y 4 stat tiles. Cada tile es `rounded-control bg-surface-2 p-3`, con label en `text-caption text-foreground-muted` y valor en `font-mono text-title`.
9. **Pantalla bloqueada**: quita el 🚫 y usa `IconTile` de 52px con `Lock` en tono danger.

## Turnos · `app/(app)/dashboard/appointments/page.tsx`
1. `PageHeader`: título "Turnos", subtítulo "{n} hoy · {completed} terminados" y `actions` = `SegmentedControl` Lista/Día/Semana (en escritorio se suma el botón "Nuevo turno").
2. **Tira de días** (nuevo; solo en la vista Lista y en Día):
   - `grid grid-cols-7 gap-1 px-4 pt-[18px]`. Cada día es un botón `rounded-[14px] py-2 pb-2.5 flex flex-col items-center gap-1`, con el día corto ("Lun") en `text-[11px] font-medium opacity-75` y el número en `text-[17px] font-semibold`.
   - Debajo va un punto de 4px si ese día tiene turnos (`bg-border-2`).
   - El día seleccionado va en `bg-inverse text-inverse-foreground`, con el punto en `inverse-foreground`.
   - Al tocar un día, se desplaza la lista hasta esa fecha (con `scrollTo` del contenedor, **no `scrollIntoView`**) o se filtra la consulta a ese día; elige lo que sea más simple con `useInfiniteAppointments`. Las flechas para cambiar de semana van como `Button icon ghost` a los lados del header de la tira, o se cambia de semana deslizando.
3. **FilterChips** `pt-4`: Todos · Por atender (pending + confirmed + reminded + client_confirmed + checked_in) · En curso · Terminados · Cancelados (cancelled + no_show), cada uno con su conteo. Mantén el buscador actual, pero escondido detrás de un `Button icon ghost` con `Search` en el header; al tocarlo aparece el `SearchInput` en lugar de la tira.
4. **Lista**: por fecha, una `SectionLabel` con la fecha ("Hoy", "Mañana" o "Jueves 11 de junio"); dentro, `SectionLabel` "Mañana" / "Tarde" con contador y un `ListGroup` de `ListRow`.
   - Fila: time block + nombre (con "N° 0147" en `font-mono text-caption text-foreground-subtle` a la derecha del nombre si existe) + "servicio · staff" con el punto de color del servicio + `StatusTag`.
   - `dimmed` para completed, cancelled y no_show.
   - **Sin borde izquierdo de color.** La acción rápida `onAdvance` se mueve al detalle y al bloque "Ahora" del Inicio.
5. **Día / Semana** (`components/calendar/*`): no tienen mockup nuevo. Aplica los tokens:
   - rail de horas en `font-mono text-caption text-foreground-subtle`;
   - líneas de hora `border-border` y medias horas `border-border/50 border-dashed`;
   - bloques `rounded-[10px] bg-[var(--st-tint)] border-l-[3px] border-[var(--st-c)] px-2 py-1.5`, con la hora en `font-mono text-caption` y el nombre en `text-meta font-semibold text-foreground`;
   - **línea de "ahora"** de 1.5px en `bg-secondary`, con un punto de 8px y la hora en `font-mono text-caption text-secondary-600`;
   - en Semana, el día de hoy se marca con el número en burbuja `bg-inverse text-inverse-foreground` y la columna sin tinte.
6. Empty state: `EmptyState` con el ícono `Calendar`, "Sin turnos este día" / "Tu página de reservas sigue abierta." y la acción "Crear turno".

## Detalle de turno · `components/appointments/AppointmentModal.tsx`
Es un `Sheet` sin título textual (`aria-label`). Contenido:
1. **Cabecera**:
   - Avatar de 52 con `seed=customer_id`;
   - nombre en `text-title font-semibold` y teléfono en `font-mono text-meta text-foreground-muted mt-[3px]`;
   - botón de cerrar de 40×40.
2. Fila `mt-4 flex items-center gap-2`:
   - `StatusTag` (`h-7 text-meta`) con la hora del cambio si existe ("Llegó · 11:24");
   - "N° 0147" en `font-mono text-caption text-foreground-subtle`.
3. **Datos**: `mt-[18px] grid grid-cols-2 gap-px bg-border border border-border rounded-[18px] overflow-hidden`. Cada celda es `bg-surface px-3.5 py-3`, con la clave en `text-caption text-foreground-subtle` y el valor en `text-body font-medium mt-[3px]` (con el punto de color en Servicio y Profesional). Celdas, en este orden: Fecha "Vie 12 jun", Hora "11:30 – 13:00", Servicio, Profesional, Duración, Precio (`font-mono`).
4. **Acción principal**: `Button primary lg w-full mt-[18px]` con la etiqueta de `NEXT_ACTIONS` en versión larga ("Empezar atención", "Terminar", "Marcar llegada", "Confirmar"). Si es terminal, no se muestra.
5. **Acciones secundarias**: `grid grid-cols-3 gap-2 mt-2` con `Button secondary` de `h-12 rounded-[14px]`, ícono de 17px y label. Son: WhatsApp (`MessageCircle`), Mover (`CalendarClock`, abre `AppointmentRescheduleSheet`) y Cancelar (`X`, en tono `danger`, abre `ConfirmSheet`). "No vino" va en un `KebabMenu` de la cabecera, junto al cierre.
6. **Crear y editar**: `Sheet` con título "Nuevo turno" y `Field` para cliente (`CustomerPicker`), fecha y hora (2 columnas), servicio y profesional. Servicio y profesional se eligen con chips seleccionables `h-11 rounded-control border border-border-2 px-3.5`, con el punto de color; el seleccionado va en `border-primary bg-primary-100 dark:bg-primary-900`. Los demás campos son Notas y `SheetFooter` (Cancelar · Crear turno).

## Servicios · `app/(app)/dashboard/services/page.tsx` + `ServiceCard.tsx`
1. `PageHeader`: "Servicios", subtítulo "{activos} activos · {pausados} pausado(s)", acción "Nuevo" (`secondary`). Debajo, `SearchInput` "Buscar servicio".
2. Un único `ListGroup` (`mt-5`) en lugar de la grilla de cards. `ServiceCard` pasa a ser `ServiceRow`:
   - `leading`: swatch de 42 (fondo `color+"22"` y cuadrado interior de 12 en `color`);
   - título: nombre, con el precio a la derecha (`font-mono text-body font-medium`);
   - subtítulo: "30 min · Reserva online" (y "+10m buffer" o "Requiere aprobación" si corresponde; "Pausado" si `!is_active`);
   - `trailing`: `Switch`, solo si `canManage`;
   - `dimmed` si está pausado;
   - **tocar la fila abre la edición.** Se quitan la barra superior de color, el ícono de tijera y el botón "Editar".
3. Nota al pie: `text-meta text-foreground-subtle px-1 mt-3.5`, "Los servicios pausados no aparecen en tu página de reservas."
4. En escritorio (`lg`), el ListGroup tiene un ancho máximo de `max-w-3xl`.

## Clientes · `app/(app)/dashboard/customers/page.tsx` + `CustomerCard.tsx`
1. `PageHeader`: "Clientes", subtítulo "{total} en tu base". Acciones: "Nuevo", más `KebabMenu` con Exportar CSV y Recuperar clientes. Debajo, `SearchInput` "Nombre, teléfono o email" y `FilterChips` Activos/Inactivos.
2. Lista agrupada por **inicial** (`SectionLabel` con la letra, en `text-foreground-subtle`) y un `ListGroup` por letra. **Mantén la virtualización**: virtualiza filas e incluye los headers como ítems del virtualizer.
3. `CustomerRow`:
   - `leading`: Avatar de 40;
   - título: nombre, con `Badge muted` "Inactivo" si corresponde (**se quita el chip "WA"**);
   - subtítulo: el mejor dato disponible, en este orden: próximo turno ("Próximo turno hoy 18:00"), "Última visita {fecha} · {n} turnos" si `last_visit` y `total_visits` existen en el tipo, y si no, el teléfono en `font-mono`;
   - `trailing`: `ChevronRight`;
   - tocar la fila abre la edición. Desactivar o reactivar va dentro del sheet de edición, como `Button danger`.

## Profesionales, Usuarios, Organizaciones, Recordatorios, Viajes
Sin mockup propio. Aplican el mismo patrón:
- `PageHeader` + `SearchInput` + `FilterChips` si hay filtros + `ListGroup` de `ListRow`.
- **Staff**: Avatar con `color` del staff y un punto verde de 10px abajo a la derecha si es reservable (`ring-2 ring-surface`). Subtítulo con las especialidades separadas por " · ". `trailing` = `Switch` "Reservable" o `KebabMenu`.
- **Users**: Avatar + nombre + email (`text-meta`) + `Badge` de rol.
- **Organizations**: `IconTile` (`Building2`) + nombre + "/slug · {n} miembros" + `Badge` de licencia (Activa = primary, Por vencer = warning, Vencida = danger, Sin licencia = muted).
- **Reminders**: los day chips usan el mismo estilo que la tira de días de Turnos. Las 3 stat cards mesh pasan a una sola `Card` con 3 columnas (número en `font-display text-[40px]` + label en `text-meta`). El CTA de envío masivo es `Button whatsapp lg w-full`. En cada fila, `trailing` = `Button whatsapp sm` "Enviar".
- **Trips**: `TripCard` pasa a `ListRow`, con la fecha y hora en el time block, el destino y "32/40 asientos" con una mini barra de 4px.

## Login / Register / Forgot password
Sin mockup. Layout centrado `max-w-sm` sobre `bg-background`:
- Logo con wordmark (32);
- título en `font-display text-[40px]` ("Bienvenida de nuevo" / "Crea tu negocio");
- subtítulo en `text-body text-foreground-muted`;
- `Field` + inputs;
- `Button primary lg w-full`;
- links en `text-meta font-semibold text-primary-700`.

Sin cards con sombra ni mesh.

---

## Landing · `app/(app)/home-client.tsx` + `components/landing/PricingSection.tsx`
Referencia: `TurnoFlash Landing.dc.html`. Es solo para tema claro: fuerza `light` en esta ruta o quita el toggle de tema de la nav. **Mantén** toda la lógica actual (redirección de Capacitor, hash de auth, `ctaTarget`/`ctaLabel` con `user`, y los precios importados de `config/license-pricing.ts`; nunca los pongas fijos). Contenedor de sección: `max-w-[1240px] mx-auto px-5 sm:px-8 lg:px-12`. Separación entre secciones: `pt-16 sm:pt-24 lg:pt-[120px]`.

1. **Nav**:
   - `sticky top-0 z-10 h-[68px] bg-background/85 backdrop-blur border-b border-border`.
   - Logo con wordmark (30px, texto de 21px).
   - Links en el centro, ocultos por debajo de `md`: Funciones, Pasajes, Precios, Preguntas y Ayuda, en `text-sm font-medium text-foreground-muted`.
   - "Iniciar sesión" (`text-sm font-semibold`), solo si no hay `user`.
   - `Button primary` de `h-10 rounded-control` con "Probar gratis" (o "Ir al Dashboard").
2. **Hero**: `grid lg:grid-cols-2 gap-14 items-center py-12 lg:py-24`.
   - Pill `h-8 rounded-full bg-secondary-100 text-secondary-600 text-meta font-semibold` con `MessageCircle` de 16: "Recordatorios automáticos por WhatsApp".
   - H1 `font-display font-normal text-[56px] sm:text-[80px] lg:text-[108px] leading-[0.94] tracking-[-0.02em] mt-6`: "Tu agenda,<br/>en piloto <em class="text-primary">automático.</em>" (con Instrument Serif itálica).
   - Párrafo `text-[17px] lg:text-[20px] leading-relaxed text-foreground-muted max-w-[520px] mt-6`.
   - CTAs `mt-8 flex flex-wrap gap-2.5`: `Button primary lg` "Probar 15 días gratis" + `ArrowRight`, y `Button secondary lg` "Ver precios" (ancla `#precios`).
   - Checks `mt-7 flex flex-wrap gap-x-[22px] gap-y-2.5 text-sm text-foreground-muted`, cada uno con `Check` de 16 en `text-primary`.
   - Visual a la derecha (`relative min-h-[600px]`):
     - fondo `absolute inset-[40px_6%_0_18%] rounded-[40px] bg-primary-100`;
     - **mockup del Inicio**: un componente estático que recrea la pantalla Inicio de `TF Screen`, escalado a 0.82, o un screenshot nuevo de la app ya migrada en `public/images/hero-home.webp` (recomendado), con `rounded-[44px]`;
     - **card de WhatsApp** `absolute left-0 bottom-14 w-[300px] bg-surface rounded-[22px] p-4 shadow-[0_0_0_1px_var(--color-border),0_24px_48px_-20px_rgba(22,23,20,.28)]` con: cabecera (punto verde + "WhatsApp · Barbería Demo", `text-caption font-semibold text-foreground-subtle`), burbuja recibida `bg-surface-2 rounded-[4px_16px_16px_16px] px-3 py-2.5 text-sm`, burbuja "OK" `self-end bg-primary-100 text-primary-700 rounded-[16px_4px_16px_16px] font-semibold` y la línea "Turno confirmado · la agenda se actualizó sola" con `CircleCheck` en `text-primary-700`.
3. **Franja de rubros**: `border-y border-border py-6`, centrada y con wrap. "Hecho para" en `text-meta font-semibold`, seguido de "Peluquerías · Barberías · Clínicas · Estéticas · Talleres · Agencias de viaje" en `font-display text-[22px] lg:text-[30px] text-foreground-subtle`, con `gap-x-7`.
4. **Cómo funciona**: label `text-sm font-semibold text-primary-700`, H2 `font-display text-[40px] lg:text-[68px] leading-none mt-2.5` y una grilla de 3 columnas (`gap-10 mt-12`). Cada paso tiene `border-t border-border-2 pt-5`, el número "01" en `font-display text-[64px] text-primary`, el título en `text-title font-semibold mt-4` y el texto en `text-body text-foreground-muted leading-relaxed mt-2`. Los textos son los de `HOW_IT_WORKS`.
5. **Funciones** (`#funciones`):
   - **Tile WhatsApp**: `bg-inverse text-[#f2f1ec] rounded-[28px] p-6 lg:p-12 grid lg:grid-cols-2 gap-10`. A la izquierda, `IconTile pink` de 48 + título `font-display text-[34px] lg:text-[48px]` + texto en `#b6b5ae`. A la derecha, una **línea de tiempo** de 5 filas (`border-t border-[#2a2d2a] py-3.5 flex gap-4`) con el momento en `font-mono text-meta text-[#7c7c75] w-[110px]` y el qué + detalle: Al reservar → Confirmación; 24 h antes → Recordatorio; 1 h antes → Último aviso; Al terminar → Valoración; Cada mañana → Resumen para el dueño.
   - Debajo, `grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3` con 7 cards (`Card p-6 gap-3.5`, `IconTile` de 42 + título `text-lead font-semibold` + texto `text-sm text-foreground-muted`). Salen de `FEATURES` sin la de WhatsApp, con los íconos `Calendar`, `CalendarCheck`, `Users`, `ChartColumn`, `HeartHandshake`, `ListOrdered` y `Smartphone`.
6. **Pasajes** (`#pasajes`): franja completa `bg-inverse text-[#f2f1ec] py-16 lg:py-[104px]`.
   - Label en `#ee5a9c`. H2 "¿Vendes pasajes? <em class="text-[#6dd497]">También es para ti.</em>". Párrafo en `#b6b5ae`.
   - Grilla de 2 columnas. A la izquierda, un **mock de salida**: `bg-[#181a18] border border-[#2a2d2a] rounded-[24px] p-[22px]` con fecha y título, una barra de asientos de 8px, la lista de paradas en un ListGroup oscuro y la línea de anticipos. Puede ser estático o, mejor, un screenshot real.
   - A la derecha, `grid sm:grid-cols-2 gap-x-8 gap-y-7` con los 6 `TRIP_FEATURES` (ícono de 22 en `#6dd497`, título `text-lead`, texto `text-sm text-[#b6b5ae]`).
7. **Seguridad**: header de 2 columnas (H2 a la izquierda, párrafo con link de privacidad a la derecha, `items-end`). Debajo, `grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-[22px] overflow-hidden mt-10` con 4 celdas `bg-surface p-6` (ícono de 22 en `text-primary` + título + texto). Son los textos de `TRUST_POINTS`.
8. **Precios** (`#precios`, en `PricingSection.tsx`):
   - Header `flex flex-wrap justify-between items-end`, con el `SegmentedControl` de períodos a la derecha. "Anual" lleva el tag "2 meses gratis" (`bg-primary-100 text-primary-700 text-[11px]`).
   - Grilla de 4 planes (`gap-3 mt-10`). Cada card es `rounded-[24px] p-[26px] border border-border bg-surface flex flex-col` y lleva:
     - nombre en `text-lg font-semibold` y audiencia en `text-sm text-foreground-muted min-h-10`;
     - precio en `font-display text-[64px] leading-[0.9]` + "USD {unidad}";
     - "Te sale a $X al mes" en `text-meta font-semibold text-primary-700`;
     - puntos con `Check` de 16;
     - `Button secondary lg w-full` "Probar 15 días gratis".
   - **Salón destacado**: `bg-inverse text-[#f2f1ec]`, tag "El más elegido" (`bg-[#38b86c] text-[#06210f]`) y CTA `bg-[#38b86c] text-[#06210f]`.
   - Debajo: la card de segundo módulo con el chip `font-mono` "+$3 / mes", las 4 condiciones (ícono + título + texto, sin cards) y la nota legal en `text-meta text-foreground-subtle`.
   - Se quita la lista `INCLUDED` (ya la cubren las funciones). Si prefieres conservarla, ponla como texto corrido debajo de los planes.
9. **FAQ** (`#preguntas`): grilla de 2 columnas. A la izquierda, el H2 "Preguntas frecuentes" y "¿No encuentras lo que buscas? Escríbenos a {email}". A la derecha, un acordeón con `border-t border-border-2`: cada ítem va en `border-b`, la pregunta es un botón `py-5 text-lead font-semibold` con `Plus`/`Minus` de 20 en `text-foreground-subtle`, y la respuesta va en `text-body text-foreground-muted leading-relaxed pb-[22px] pr-10`. El primero está abierto. Los textos son los de `FAQS`.
10. **CTA final**: `rounded-[32px] bg-primary text-white p-10 lg:p-[88px] flex flex-wrap justify-between items-end gap-8`, con "¿Empezamos?" en `font-display text-[56px] lg:text-[112px] leading-[0.92]`, un párrafo en `text-[18px] text-[#d9efe0]` y un botón blanco `h-14 rounded-[14px] bg-white text-primary-700` con "Comenzar gratis" + `ArrowRight`. Si hay `user`, el texto y la etiqueta cambian como hoy.
11. **Footer**: `flex flex-wrap gap-x-16 gap-y-10`. Bloque de marca (logo con wordmark, descripción y email) y las columnas Producto y Legal (título en `text-meta font-semibold text-foreground-subtle`, links en `text-sm text-foreground-muted`). Copyright `border-t border-border pt-5 mt-12 text-meta text-foreground-subtle`.
- **Se elimina** la galería `tf-1/2/3.webp`.
