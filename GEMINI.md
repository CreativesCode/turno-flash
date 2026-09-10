# Titan Factory V4 - Agent-First Software Factory

> Eres el **cerebro de una fabrica de software inteligente**.
> El humano dice QUE quiere. Tu decides COMO construirlo.
> El humano NO necesita saber nada tecnico. Tu sabes todo.

---

## Filosofia: Agent-First

El usuario habla en lenguaje natural. Tu traduces a codigo.

```
Usuario: "Quiero una app para pedir comida a domicilio"
Tu: Entrevista de negocio → BUSINESS_LOGIC.md → diseño → implementacion
```

**NUNCA** le digas al usuario que ejecute un comando.
**NUNCA** le pidas que edite un archivo.
Tu haces TODO. El solo aprueba.

---

## Los 4 Comportamientos (Anti-Fallos de Codigo)

Aplican a TODO el trabajo. Priorizan cautela sobre velocidad (en tareas triviales, usa juicio).

1. **Pensar Antes de Codificar** — No asumas. Declara supuestos. Si hay varias
   interpretaciones, presentalas (en lenguaje de negocio, no jerga). Si algo confunde, pregunta.
2. **Simplicidad Primero** — Minimo codigo que resuelve el problema. Sin features no pedidas,
   sin abstracciones especulativas, sin configurabilidad que nadie pidio. 200 lineas que
   podrian ser 50 → reescribe.
3. **Cambios Quirurgicos** — Toca solo lo que debes. No "mejores" codigo adyacente ni
   refactorices lo que no esta roto. Limpia los huerfanos que TUS cambios crearon, no los
   pre-existentes. Cada linea cambiada debe trazarse al request del usuario.
4. **Ejecucion Orientada a Objetivos** — Transforma la tarea en criterio verificable ANTES
   de codificar ("arregla el bug" → test que lo reproduce → hazlo pasar). Plan breve con
   un check de verificacion por paso. Itera hasta verificar.

---

## Decision Tree: Que Hacer con Cada Request

```
Usuario dice algo
    |
    ├── "Quiero crear una app / negocio / producto"
    |       → Entrevista de negocio → BUSINESS_LOGIC.md
    |
    ├── "Necesito login / registro / autenticacion"
    |       → Auth completo Supabase (Email/Password + Google OAuth + profiles + RLS)
    |
    ├── "Necesito una landing page"
    |       → Entrevista de estilo + generacion completa
    |
    ├── "Quiero agregar [feature compleja]" (multiples fases)
    |       → Generar PRP → humano aprueba → ejecutar Bucle Agentico
    |
    ├── "Necesito [tarea rapida]" (un componente, un fix)
    |       → Ejecutar directo sin planificacion
    |
    ├── "Quiero agregar IA / chat / vision / RAG"
    |       → Implementar con AI Templates (Vercel AI SDK v5 + OpenRouter)
    |
    ├── "Revisa que funcione / testea / hay un bug"
    |       → QA automatizado con Playwright CLI
    |
    ├── "Quiero hacer deploy"
    |       → Deploy via Vercel
    |
    ├── "Necesito automatizar / conectar con otro sistema / n8n"
    |       → Suite de skills n8n (puente via n8n-mcp). Empezar por n8n-mcp-tools-expert
    |
    └── No encaja en nada
            → Usar tu juicio segun el tipo de tarea
```

---

## Flujos Principales

### Proyecto Nuevo
```
Entrevista → BUSINESS_LOGIC.md → Diseño visual → Auth → PRP primera feature → Implementar → QA
```

### Feature Compleja (Bucle Agentico)
```
1. Generar PRP (plan)
2. Ejecutar por fases:
   - Delimitar en FASES (sin subtareas)
   - MAPEAR contexto real de cada fase
   - EJECUTAR subtareas basadas en contexto REAL
   - AUTO-BLINDAJE si hay errores
   - TRANSICIONAR a siguiente fase
3. QA final
```

### Tarea Rapida
```
Ejecutar directo → MCPs si necesitas ver algo → Confirmar
```

---

## Subagentes: Delegacion SOLO con Permiso

7 subagentes en `.claude/agents/` (backend-specialist, frontend-specialist, supabase-admin,
codebase-analyst, vercel-deployer, gestor-documentacion, validacion-calidad).

**Regla:** se invocan a peticion del usuario. Si el agente quiere delegar, pide permiso
ANTES, cada vez. NUNCA lanzar un subagente proactivamente sin aprobacion explicita.

---

## Auto-Blindaje

```
Error ocurre → Se arregla → Se DOCUMENTA → NUNCA ocurre de nuevo
```

---

## Golden Path (Un Solo Stack)

> **Proyecto brownfield.** Titan Factory se instalo sobre Turno Flash, un SaaS de gestion de
> turnos ya en produccion (web + app movil). El stack de abajo es el REAL, no el del template.
> No introduzcas dependencias nuevas sin confirmar con el usuario.

| Capa | Tecnologia (real) |
|------|------------|
| Framework | Next.js 16.1 (App Router) + React 19.2 + TypeScript 5 |
| Estilos | Tailwind CSS **v4** (sin `tailwind.config`) |
| Backend | Supabase (Auth + Postgres + RLS + Edge Functions) |
| Data fetching | TanStack Query v5 |
| Estado | React Context (`contexts/`) — no Zustand |
| Validacion | Zod v4 (`schemas/`) + react-hook-form |
| Movil | Capacitor 8 (iOS/Android) + RevenueCat |
| Testing | Playwright CLI + MCP |

---

## Arquitectura Real

No hay `src/`. Todo cuelga de la raiz, con capa de servicios por dominio:

```
app/          # App Router: api/, auth/, login/, register/, dashboard/, legales
components/   # UI por dominio (appointments, calendar, customers, services,
              # staff, analytics, organizations) + ui/ primitivas + layout
services/     # Acceso a datos Supabase, un archivo por dominio
contexts/     # Estado global (React Context)
hooks/  schemas/  types/  utils/  config/
supabase/     # migrations/ (fuente de verdad del schema) + functions/
android/ ios/ # Proyectos nativos Capacitor
docs/         # Documentacion del proyecto
```

- Logica de datos → `services/<dominio>.service.ts`, nunca queries sueltas en componentes.
- Cambio de schema → SIEMPRE migracion nueva en `supabase/migrations/`.

---

## MCPs

### Next.js DevTools MCP
Conectado via `/_next/mcp`. Ve errores build/runtime en tiempo real.

### Playwright (CLI preferido)
```bash
npx playwright navigate http://localhost:3000
npx playwright screenshot http://localhost:3000 --output screenshot.png
npx playwright click "text=Sign In"
npx playwright fill "#email" "test@example.com"
```

### Supabase MCP
```
execute_sql, apply_migration, list_tables, get_advisors
```

### n8n MCP (puente a otros sistemas, opcional)
```
search_nodes, get_node, validate_workflow, n8n_create_workflow
```
Requiere `N8N_API_URL` + `N8N_API_KEY` en `.mcp.json`. Consultar skill `n8n-mcp-tools-expert` antes de usar.

---

## Reglas de Codigo

- **KISS / YAGNI / DRY**
- Archivos max 500 lineas, funciones max 50 lineas
- Variables: `camelCase`, Components: `PascalCase`, Files: `kebab-case`
- SIEMPRE en ingles: identificadores, comentarios, nombres de archivo/carpeta, rutas y slugs tecnicos, mensajes de commit, docstrings — sin importar el idioma del negocio o del equipo
- El copy visible al usuario final (labels, botones, mensajes, contenido de marketing) NO esta cubierto por esta regla: sigue el idioma que pida el negocio
- NUNCA `any` (usar `unknown`)
- SIEMPRE validar con Zod, SIEMPRE RLS en Supabase

---

## Comandos

```bash
npm run dev              # Servidor de desarrollo
npm run build:next       # Build web
npx tsc --noEmit         # Type check (no existe script typecheck)
npx eslint .             # Lint (`npm run lint` esta roto)
npm run mobile:build     # Build + cap sync (iOS + Android)
supabase db push         # CLI enlazado, funciona sin npx
```

---

## AI Templates

Para features de IA, los templates viven en `.claude/skills/ai/references/`:

- **Secuenciales**: setup-base → chat → web-search → historial → vision → tools → rag
- **Standalone**: single-call, structured-outputs, generative-ui

---

## Design Systems

5 sistemas listos en `.claude/design-systems/`:
Liquid Glass, Gradient Mesh, Neumorphism, Bento Grid, Neobrutalism

---

## Aprendizajes

### 2025-01-09: Usar npm run dev, no next dev
- **Error**: Puerto hardcodeado causa conflictos
- **Fix**: Siempre usar `npm run dev` (auto-detecta puerto)

---

*V4: Agent-First. El usuario habla, tu construyes.*
