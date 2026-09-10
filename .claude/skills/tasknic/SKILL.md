---
name: tasknic
description: >
  Conectar con Tasknic (el gestor de tareas del equipo) vía su Agent API: crear tareas
  para humanos, leer proyectos/tareas, mover tareas de estado, dejar comentarios,
  adjuntar archivos, y leer/escribir el Espacio del proyecto (documentos, notas y
  transcripciones de reuniones Leexi). También cubre administración: crear/editar/borrar
  proyectos y sus miembros, invitar o editar gente del equipo, plantillas de tareas,
  columnas del tablero, dependencias entre tareas, historial de actividad y novedades
  (changelog) — paridad casi completa con lo que un admin puede hacer desde la UI web.
  Usar cuando el usuario diga: "deja esta tarea en tasknic", "crea una tarea en tasknic
  para X", "qué tareas hay en tasknic", "mueve la tarea a hecho", "adjunta esto a la
  tarea", "lee la reunión / grabación", "guarda esta nota en el espacio", "crea un
  proyecto en tasknic", "invita a X al equipo", "bloquea esta tarea con la otra",
  "crea una plantilla de tarea", o cualquier variante de delegar/consultar trabajo o
  administración en Tasknic.
---

# Tasknic Agent API

Eres un agente conectado a **Tasknic**, el gestor de tareas del equipo. Apareces ahí como el usuario "Claude (Agente IA)". Cuando creas o comentas una tarea, el humano asignado recibe notificación in-app y WhatsApp automáticamente — no necesitas avisarle por otro canal.

**Atribución (`requested_by`) — regla fija, no la saltees "para simplificar":** cuando crees una tarea (`POST /tasks`), dejes un comentario (`POST /tasks/:id/comments`), o subas un adjunto (`POST /tasks/:id/attachments`), si sabés con qué humano estás chateando en esta sesión (quien te lo pidió), **siempre** mandá su nombre en el campo `requested_by`. Es opcional a nivel de API (no rompe si lo omitís), pero omitirlo cuando sí sabés quién te lo pidió es un error — le sacás a esa persona algo que le corresponde. Efectos concretos de mandarlo bien:
- Puede borrar esa tarea/comentario/adjunto sin ser admin (si sos `member`, no `admin`, y el archivo lo subió el agente, sin este campo NUNCA vas a poder borrarlo vos — quedás afuera para siempre, no es un botón que "tarda en aparecer").
- En el Kanban/Lista/Drawer/comentarios se ve su avatar con el tuyo superpuesto ("con ayuda de Claude Code") en vez de solo "Claude (Agente IA)" (tareas y comentarios; los adjuntos todavía no tienen ese avatar en la UI, solo heredan el permiso de borrado).
- En el Historial de la tarea (quién la creó, quién comentó, quién la movió de estado) se ve su nombre + 🤖 en vez de "Claude (Agente IA)" a secas — esto incluye los cambios de estado que hagas después con `PATCH /tasks/:id`: heredan automáticamente el `requested_by` que quedó guardado al crear la tarea, no hace falta (ni se puede) mandarlo de nuevo en el PATCH.

Si NO sabés quién te lo pidió (por ejemplo, te llegó de un cron o de otro sistema sin contexto humano), no inventes un nombre: dejá `requested_by` afuera y va a quedar atribuido solo al agente.

### ¿Quién es "el humano que te lo pidió"?

Es la persona con la que estás conversando **en esta sesión, ahora** — no un nombre fijo. A Tasknic le puede escribir cualquier miembro del equipo, cada uno con su propia cuenta, y quien te habla hoy no tiene por qué ser el mismo que ayer, ni el dueño del repo, ni el que aparece en los ejemplos de esta guía. Por eso, a partir de acá, todos los ejemplos usan `<nombre>` como marcador de posición: reemplazalo siempre por el nombre real que determinaste — nunca lo copies literal, y nunca reutilices un nombre que viste en otra parte de este documento o de una sesión anterior.

Cómo determinarlo, en este orden:

1. **Lo que te haya dicho la conversación.** Si la persona se identificó, o el contexto deja claro quién es, usá ese nombre.
2. **Si no está claro, preguntá.** Un "¿a nombre de quién dejo esto?" antes de crear la tarea/comentario es mucho mejor que adivinar mal — te lleva dos segundos y evita atribuirle el pedido a la persona equivocada (le da permiso de borrado a quien no corresponde, y queda mal en el Historial de la tarea, visible para todo el equipo).
3. **Nunca asumas por defecto.** Este es justamente el bug que esta sección existe para prevenir: `requested_by` terminó saliendo siempre con el mismo nombre (el que aparecía en los ejemplos de esta guía) aunque quien pedía la acción, sesión tras sesión, era otra persona distinta del equipo.
4. Si de verdad no hay forma de saberlo (cron, otro sistema, sin humano de por medio), dejá `requested_by` afuera — como ya dice la regla de arriba.

## Conexión

- Base URL: `https://usqjmmkwdfugwcrfgojw.supabase.co/functions/v1/agent-api`
- Auth: header `Authorization: Bearer $TASKNIC_API_KEY`
- La key vive en la variable de entorno `TASKNIC_API_KEY`, o en el `.env.local`/`.env` del proyecto como `TASKNIC_API_KEY=tk_...`. Antes de la primera llamada, cárgala así:

```bash
export TASKNIC_API_KEY="${TASKNIC_API_KEY:-$(grep -h '^TASKNIC_API_KEY=' .env.local .env 2>/dev/null | head -1 | cut -d= -f2)}"
export BASE="https://usqjmmkwdfugwcrfgojw.supabase.co/functions/v1/agent-api"
``` Si no aparece en ningún lado, pide al usuario que un admin genere una en Tasknic → Configuración → "Agentes de IA — API keys" y la guarde en `.env.local`. NUNCA commitees la key.

Todas las llamadas son `curl` simples con JSON. `GET /` devuelve el índice de endpoints si necesitas recordarlos.

## Operaciones

### Dejar una tarea a alguien ("deja esta tarea en tasknic para X")

1. Si no sabes el proyecto exacto, lista: `GET /projects` (o pregunta al usuario cuál).
2. Crea la tarea — proyecto y asignados van **por nombre**, no hace falta UUID:

```bash
curl -s -X POST "$BASE/tasks" -H "Authorization: Bearer $TASKNIC_API_KEY" \
  -H "Content-Type: application/json" -d '{
    "project": "Content OS",
    "title": "Título corto y accionable",
    "description": "Contexto en Markdown: qué hay que hacer, criterios de listo, links.",
    "priority": "alta",
    "due_date": "2026-08-01",
    "assignees": ["<nombre>"],
    "tags": ["bug", "cliente"],
    "requested_by": "<nombre>"
  }'
```

- `priority`: `baja|media|alta|urgente` (o low/medium/high/urgent). `due_date` opcional, formato YYYY-MM-DD.
- `recurrence` (opcional, default `none`): `none|daily|weekly|monthly` — para tareas que se repiten.
- `tags` (opcional): nombres de etiquetas (ver sección "Tags" más abajo).
- `requested_by` (opcional): el humano que te pidió crear esta tarea (ver "Atribución" arriba). Mandalo si lo sabés.
- Si el nombre es ambiguo la API responde `409` con `candidates` — elige o pregunta al usuario.
- Escribe título y descripción en el idioma del equipo (español), con el contexto suficiente para que el humano no tenga que preguntarte nada.

### Consultar trabajo

```bash
curl -s "$BASE/projects/Content OS/tasks?status=Por hacer&assignee=<nombre>" -H "Authorization: Bearer $TASKNIC_API_KEY"
curl -s "$BASE/tasks/<id-o-code>" -H "Authorization: Bearer $TASKNIC_API_KEY"   # detalle + subtareas + comentarios
curl -s "$BASE/team" -H "Authorization: Bearer $TASKNIC_API_KEY"          # miembros, para resolver nombres
```

Cada tarea trae `code` (ej. `CID0001`): un identificador corto legible, prefijo del
proyecto + secuencia, autogenerado e inmutable — útil para referenciarla en texto sin
pegar el UUID completo. Es solo de lectura, no se manda al crear ni al actualizar.

**Todo `<id>` de tarea en esta guía acepta el UUID o el `code`, indistintamente** —
`GET/PATCH/DELETE /tasks/:id`, sus subrutas (`/activity`, `/comments`, `/attachments`,
`/dependencies`) y el campo `depends_on`/`parent_task_id` en el body. No hace falta
resolver el código a UUID vos mismo: mandá `"CID0001"` directo donde iría el UUID
(insensible a mayúsculas). Si preferís usar el UUID igual funciona — es la misma
tarea, dos formas de referenciarla.

### Mover una tarea / actualizarla

```bash
curl -s -X PATCH "$BASE/tasks/<id>" -H "Authorization: Bearer $TASKNIC_API_KEY" \
  -H "Content-Type: application/json" -d '{"status": "En progreso"}'
```

`status` acepta la etiqueta visible de la columna ("Por hacer", "En progreso", "En revisión", "Hecho", o columnas custom) o su key. También puedes cambiar `title`, `description`, `priority`, `due_date`, `recurrence`, `assignees` y `tags` (los últimos dos reemplazan el set completo — mandá la lista final, no un delta).

### Tags (etiquetas)

Catálogo global del workspace (no por proyecto), nombre único. Se pasan **por nombre**, nunca por UUID:

```bash
curl -s "$BASE/labels" -H "Authorization: Bearer $TASKNIC_API_KEY"   # catálogo existente: [{id, name, color}]
```

En `POST /tasks` y `PATCH /tasks/:id` el campo `tags: string[]` resuelve cada nombre contra ese catálogo; si un tag no existe **se crea al vuelo** (igual que en la UI web — cualquier miembro puede crear tags, no hace falta ser admin). Antes de inventar un nombre nuevo, revisa `GET /labels` para reusar uno existente y evitar duplicados por variaciones de escritura (`"Bug"` vs `"bug"` sí matchea insensible a mayúsculas; `"bug"` vs `"bugs"` no). En `PATCH`, `tags` reemplaza el set completo de la tarea, igual que `assignees`. `GET /tasks/:id` y los listados devuelven `tags` como array de nombres.

### Adjuntar archivos a una tarea

```bash
# desde un archivo local (base64) o desde una URL
curl -s -X POST "$BASE/tasks/<id>/attachments" -H "Authorization: Bearer $TASKNIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file_name": "reporte.pdf", "mime_type": "application/pdf", "content_base64": "'"$(base64 -w0 reporte.pdf)"'", "requested_by": "<nombre>"}'

curl -s -X POST "$BASE/tasks/<id>/attachments" -H "Authorization: Bearer $TASKNIC_API_KEY" \
  -H "Content-Type: application/json" -d '{"url": "https://ejemplo.com/captura.png", "requested_by": "<nombre>"}'
```

Máx 50 MB. La respuesta trae la `url` pública. Los adjuntos existentes vienen en `GET /tasks/:id`. `requested_by` (opcional): ver "Atribución" arriba — mandalo si sabés quién te pidió subir el archivo, si no la única forma de borrarlo después va a ser que un admin lo haga.

### Espacio del proyecto (documentos, notas, reuniones)

El "Espacio" guarda el conocimiento del proyecto: notas Markdown, archivos y grabaciones de reuniones (Leexi) con transcripción. Úsalo para dar contexto o dejarlo:

```bash
curl -s "$BASE/projects/<proyecto>/space" -H "Authorization: Bearer $TASKNIC_API_KEY"     # listado
curl -s "$BASE/documents/<id>" -H "Authorization: Bearer $TASKNIC_API_KEY"                # nota/archivo completo
curl -s "$BASE/recordings/<id>" -H "Authorization: Bearer $TASKNIC_API_KEY"               # summary + transcript completos

# dejar una nota (Markdown) o subir un archivo al espacio
curl -s -X POST "$BASE/projects/<proyecto>/documents" -H "Authorization: Bearer $TASKNIC_API_KEY" \
  -H "Content-Type: application/json" -d '{"title": "Decisiones sprint 3", "body": "# Markdown…"}'
```

Si necesitas contexto de una reunión ("¿qué se decidió con el cliente?"), lee el `transcript`/`summary` de la grabación correspondiente.

### Borrar una tarea (o solo un comentario/adjunto puntual)

```bash
curl -s -X DELETE "$BASE/tasks/<id>" -H "Authorization: Bearer $TASKNIC_API_KEY"
```

Borra la tarea entera: subtareas, comentarios y adjuntos en cascada. Solo borra tareas que creaste tú o que el usuario te pida explícitamente borrar.

Para limpiar sin borrar la tarea (ej. sacar un comentario viejo o un adjunto de una versión anterior sin perder el resto del historial), hay borrado puntual:

```bash
curl -s -X DELETE "$BASE/tasks/<id>/comments/<comment_id>" -H "Authorization: Bearer $TASKNIC_API_KEY"
curl -s -X DELETE "$BASE/tasks/<id>/attachments/<attachment_id>" -H "Authorization: Bearer $TASKNIC_API_KEY"
```

Los ids salen de `GET /tasks/:id` (cada comentario y adjunto trae su `id`). Ambos limpian también el archivo en storage cuando aplica — no dejan basura. Devuelven `404` si el id no pertenece a esa tarea.

### Responder a los humanos (comentar)

```bash
curl -s -X POST "$BASE/tasks/<id>/comments" -H "Authorization: Bearer $TASKNIC_API_KEY" \
  -H "Content-Type: application/json" -d '{"body": "Hecho — detalles en **Markdown**.", "mentions": ["<nombre>"], "requested_by": "<nombre>"}'
```

Usa `mentions` cuando quieras que alguien concreto reciba la notificación de mención. Usa `requested_by` (ver "Atribución" arriba) si sabés quién te pidió dejar este comentario.

Para corregir un comentario ya publicado (tuyo o de un humano, si sos admin) en vez de borrarlo y crear uno nuevo:

```bash
curl -s -X PATCH "$BASE/tasks/<id>/comments/<comment_id>" -H "Authorization: Bearer $TASKNIC_API_KEY" \
  -H "Content-Type: application/json" -d '{"body": "texto corregido", "mentions": ["<nombre>"]}'
```

Reemplaza el cuerpo completo (no es un append) y marca `edited_at` — `GET /tasks/:id` lo devuelve para que sepas si un comentario fue editado. Mismo permiso que borrar: autor, quien lo pidió (`requested_by`), o admin.

## Administración (paridad con la UI web)

El agente opera con permisos de **admin**, igual que un humano admin en `/settings` — puede hacer casi todo lo que la UI permite. Estos endpoints son menos frecuentes que crear/mover tareas, así que aquí solo un resumen; `GET /` siempre trae la lista completa y actualizada con el shape de cada body.

- **Proyectos**: `POST /projects {name, description?, color?, status?, members?[]}` · `PATCH /projects/:id {name?, description?, color?, status?}` (status: `preparation|active|paused`) · `DELETE /projects/:id` (borra tareas/documentos/grabaciones en cascada — confirmá con el usuario antes) · `POST /projects/:id/members {member}` / `DELETE /projects/:id/members/:userId`.
- **Equipo**: `PATCH /team/:userId {full_name?, phone?, role?}` · `DELETE /team/:userId` (elimina la cuenta — irreversible, confirmá siempre). `POST /invitations {email, phone, role?}` invita por WhatsApp (el mismo flujo que la UI) · `DELETE /invitations/:id` revoca.
- **Plantillas de tareas**: `GET /templates` · `POST /templates {name, title, description?, priority?, subtasks?: [{title}]}` · `DELETE /templates/:id`.
- **Columnas del tablero** (globales, un solo Kanban para todo el workspace, no por proyecto): `GET /board-columns` · `PATCH /board-columns {columns: [{key?, label, color?, is_closing?}]}` — mandá el set COMPLETO en el orden final (la posición es el índice); sin `key` crea una columna nueva, las de sistema (`todo/in_progress/in_review/done`) nunca se borran.
- **Dependencias entre tareas** ("la tarea X bloquea a Y"): `POST /tasks/:id/dependencies {depends_on: uuid|code}` · `DELETE /tasks/:id/dependencies/:dependsOnId`. `GET /tasks/:id` devuelve `blockers: [{id, title, status}]`. `depends_on` acepta UUID o el `code` de la tarea (no nombre).
- **Historial de actividad** (solo lectura): `GET /projects/:id/activity` y `GET /tasks/:id/activity`.
- **Novedades del producto**: `GET /changelogs` · `POST /changelogs {title, body, version}` (semver, ej. `1.2.0`) — notifica in-app a todo el equipo y por WhatsApp a los admins, usalo solo cuando el usuario pida explícitamente publicar una novedad.

**NO expuesto a propósito** (no son gaps, son límites de seguridad — no los pidas ni los simules): que el agente cree o revoque sus propias API keys (`tk_...`, eso es solo humano-admin vía UI), enlaces públicos para compartir documentos/grabaciones (`share_token`), e integración en vivo con Leexi (listar/importar/grabar llamadas).

## Reglas

- NUNCA inventes UUIDs: usa nombres o ids que obtuviste de la propia API.
- Si sabés con qué humano estás chateando (quien te pidió la tarea o el comentario), mandá siempre `requested_by` con su nombre — no lo omitas "por las dudas". Le da a esa persona el permiso de borrar lo que pidió y trazabilidad visual en la UI (avatar superpuesto + nombre con 🤖 en el Historial, ver "Atribución" arriba). Determinarlo bien es responsabilidad tuya en cada sesión: nunca un nombre fijo ni asumido — ver "¿Quién es 'el humano que te lo pidió'?" arriba.
- Antes de crear una tarea revisa si ya existe una equivalente en el proyecto (`GET /projects/:ref/tasks`) para no duplicar.
- Al terminar un trabajo que te delegaron desde una tarea de Tasknic: muévela a "En revisión" (no a "Hecho" — eso lo decide un humano) y deja un comentario con el resultado.
- Errores 4xx traen un campo `error` explicativo (y `valid`/`candidates` cuando aplica): corrige y reintenta; no repitas la misma llamada tal cual.
- El agente opera con permisos de **admin** (puede borrar proyectos enteros, eliminar miembros del equipo, reescribir las columnas del tablero, etc.). Antes de cualquier `DELETE /projects/:id`, `DELETE /team/:userId`, o `PATCH /board-columns` que quite/renombre columnas existentes, confirmá explícitamente con el usuario — son cambios destructivos e irreversibles que afectan a todo el equipo, no solo una tarea puntual.
